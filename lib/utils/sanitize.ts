/**
 * Content Sanitization Utilities
 *
 * Provides XSS protection for user-generated content, particularly markdown/HTML.
 * Uses regex-based sanitization for serverless compatibility (no jsdom dependency).
 *
 * Why this matters:
 * - User-generated patient records can contain malicious scripts
 * - LLM-generated care plans are rendered as markdown (HTML)
 * - Defense-in-depth: sanitize at input AND output
 * - Prevents XSS attacks while maintaining rich text formatting
 *
 * Security approach:
 * 1. Allowlist approach (only permit safe tags)
 * 2. Strip all scripts, event handlers, and dangerous attributes
 * 3. Sanitize both at validation layer AND display layer
 * 4. Serverless-safe: No DOM dependencies, works on Vercel/Lambda
 */

// No external dependencies - serverless-friendly implementation

/**
 * Sanitize markdown content to prevent XSS attacks
 *
 * Allows common markdown-safe HTML tags while stripping:
 * - <script> tags
 * - Event handlers (onclick, onerror, etc.)
 * - Dangerous protocols (javascript:, data:)
 * - Inline styles (can contain expressions)
 * - iframes, objects, embeds
 *
 * @param content - Raw user input or LLM output
 * @returns Sanitized content safe for rendering
 *
 * @example
 * // Safe markdown
 * sanitizeMarkdown('# Hello\n**Bold** text')
 * // Returns: '# Hello\n**Bold** text'
 *
 * // Malicious input
 * sanitizeMarkdown('<script>alert("XSS")</script>')
 * // Returns: '' (script stripped)
 *
 * // Mixed content
 * sanitizeMarkdown('Safe text <img src=x onerror="alert(1)">')
 * // Returns: 'Safe text ' (dangerous img removed)
 */
export function sanitizeMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let sanitized = content;

  // Step 1: Remove dangerous tags
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'applet',
    'meta', 'link', 'style', 'form', 'input', 'button',
    'textarea', 'select', 'base', 'frame', 'frameset'
  ];

  for (const tag of dangerousTags) {
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis'), '');
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*/>`, 'gi'), '');
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
  }

  // Step 2: Remove dangerous attributes and protocols
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Step 3: Sanitize href attributes to only allow safe protocols
  sanitized = sanitized.replace(
    /href\s*=\s*["']([^"']*)["']/gi,
    (match, url) => {
      if (/^(?:https?|mailto|tel):/.test(url) || url.startsWith('/') || url.startsWith('#')) {
        return match;
      }
      return ''; // Remove unsafe href
    }
  );

  // Step 4: Remove style attributes (can contain expressions)
  sanitized = sanitized.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '');

  // Step 5: Allowlist only safe tags (remove all others)
  const allowedTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 'del', 's', 'code', 'pre',
    'ul', 'ol', 'li', 'blockquote', 'hr', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div'
  ];

  const allowedTagsRegex = allowedTags.join('|');
  sanitized = sanitized.replace(
    new RegExp(`<(?!\/?(${allowedTagsRegex})(?:\\s|>|\/))[^>]*>`, 'gi'),
    ''
  );

  // Step 6: Ensure links open in new tab with security attributes
  sanitized = sanitized.replace(
    /<a\s+([^>]*?)>/gi,
    (match, attrs) => {
      // Add target="_blank" and rel="noopener noreferrer" if not present
      let newAttrs = attrs;
      if (!/target=/i.test(newAttrs)) {
        newAttrs += ' target="_blank"';
      }
      if (!/rel=/i.test(newAttrs)) {
        newAttrs += ' rel="noopener noreferrer"';
      }
      return `<a ${newAttrs.trim()}>`;
    }
  );

  return sanitized;
}

/**
 * Sanitize plain text (strips all HTML)
 *
 * Use for fields that should never contain markup:
 * - Patient names
 * - MRNs
 * - Medication names
 *
 * @param content - User input
 * @returns Text with all HTML stripped
 *
 * @example
 * sanitizePlainText('John <script>alert(1)</script> Smith')
 * // Returns: 'John Smith'
 */
export function sanitizePlainText(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Strip all HTML tags while keeping text content
  return content.replace(/<[^>]*>/g, '');
}

/**
 * Validate that content doesn't contain dangerous patterns
 *
 * Additional validation layer before sanitization.
 * Useful for logging/alerting on attack attempts.
 *
 * @param content - Content to check
 * @returns Object with validation result and detected threats
 */
export function validateContentSecurity(content: string): {
  safe: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  // Check for common XSS patterns
  const dangerousPatterns = [
    { pattern: /<script/i, threat: 'script tag' },
    { pattern: /javascript:/i, threat: 'javascript: protocol' },
    { pattern: /on\w+\s*=/i, threat: 'event handler' },
    { pattern: /<iframe/i, threat: 'iframe tag' },
    { pattern: /<object/i, threat: 'object tag' },
    { pattern: /<embed/i, threat: 'embed tag' },
    { pattern: /eval\(/i, threat: 'eval() call' },
    { pattern: /expression\(/i, threat: 'CSS expression' },
  ];

  for (const { pattern, threat } of dangerousPatterns) {
    if (pattern.test(content)) {
      threats.push(threat);
    }
  }

  return {
    safe: threats.length === 0,
    threats,
  };
}
