/**
 * HTML Sanitization Utilities
 *
 * Prevents XSS attacks by sanitizing user input before storage and rendering.
 * Uses regex-based sanitization that works in serverless environments.
 *
 * SECURITY NOTE:
 * - Sanitize on INPUT (API layer) to store clean data
 * - React JSX already escapes on output, but this provides defense in depth
 * - Use for any user-provided text that may contain HTML/scripts
 * - Serverless-safe: No DOM dependencies (jsdom), works on Vercel/Lambda
 */

// No external dependencies - serverless-friendly implementation

/**
 * Sanitization configuration for different contexts
 */
export const SanitizeConfig = {
  /**
   * Strict mode - strips ALL HTML tags, only allows plain text
   * Use for: names, IDs, codes, numbers
   */
  STRICT: {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true, // Keep text content, strip tags
  },

  /**
   * Standard mode - allows safe formatting tags only
   * Use for: patient records, notes, descriptions
   */
  STANDARD: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'] as string[],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true,
  },

  /**
   * Permissive mode - allows more formatting including links
   * Use for: rich text content where formatting is needed
   */
  PERMISSIVE: {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'a',
      'blockquote',
    ] as string[],
    ALLOWED_ATTR: ['href', 'title'] as string[],
    KEEP_CONTENT: true,
  },
};

/**
 * Sanitize HTML/script content from user input
 *
 * Serverless-safe implementation using regex (no jsdom dependency).
 * Strips dangerous tags/attributes while optionally preserving safe formatting.
 *
 * @param input - User-provided string (may contain malicious content)
 * @param config - Sanitization strictness level
 * @returns Safe string with malicious content removed
 *
 * @example
 * // Strict sanitization (plain text only)
 * const name = sanitizeHTML(
 *   '<script>alert("xss")</script>John<b>Doe</b>',
 *   SanitizeConfig.STRICT
 * );
 * // Result: "JohnDoe"
 *
 * // Standard sanitization (safe formatting allowed)
 * const notes = sanitizeHTML(
 *   'Patient has <b>diabetes</b><script>alert("xss")</script>',
 *   SanitizeConfig.STANDARD
 * );
 * // Result: "Patient has <b>diabetes</b>"
 */
export function sanitizeHTML(
  input: string,
  config: typeof SanitizeConfig.STRICT | typeof SanitizeConfig.STANDARD | typeof SanitizeConfig.PERMISSIVE = SanitizeConfig.STANDARD
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Step 1: Remove dangerous tags completely (script, iframe, object, embed, etc.)
  const dangerousTags = [
    'script',
    'iframe',
    'object',
    'embed',
    'applet',
    'meta',
    'link',
    'style',
    'form',
    'input',
    'button',
    'textarea',
    'select',
  ];

  for (const tag of dangerousTags) {
    // Remove opening and closing tags with any attributes
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');
    // Remove self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}[^>]*/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // Step 2: Remove dangerous attributes (on*, javascript:, data:, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ''); // onclick, onerror, etc.
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, ''); // onclick without quotes
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Step 3: Apply config-specific rules
  if (config.ALLOWED_TAGS.length === 0) {
    // STRICT mode - strip ALL tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } else {
    // STANDARD/PERMISSIVE - strip tags not in allowlist
    const allowedTagsRegex = config.ALLOWED_TAGS.join('|');
    // Remove tags that aren't in the allowlist
    sanitized = sanitized.replace(
      new RegExp(`<(?!\/?(${allowedTagsRegex})(?:\\s|>|\/))[^>]*>`, 'gi'),
      ''
    );

    // Remove attributes not in allowlist (if specified)
    if (config.ALLOWED_ATTR.length > 0) {
      const allowedAttrsRegex = config.ALLOWED_ATTR.join('|');
      // This removes all attributes except those in allowlist
      sanitized = sanitized.replace(
        new RegExp(`\\s+(?!(${allowedAttrsRegex})=)[a-zA-Z-]+\\s*=\\s*["'][^"']*["']`, 'gi'),
        ''
      );
    } else {
      // No attributes allowed - remove all
      sanitized = sanitized.replace(/<([a-zA-Z]+)[^>]*>/g, '<$1>');
    }
  }

  // Step 4: Decode HTML entities to prevent double-encoding attacks
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');

  // Step 5: Re-sanitize in case decoded entities created new dangerous patterns
  if (sanitized !== input && sanitized.includes('<')) {
    // Recursively sanitize once more (but prevent infinite loop)
    const reSanitized = sanitizeHTML(sanitized, config);
    if (reSanitized === sanitized) {
      return sanitized;
    }
    return reSanitized;
  }

  return sanitized;
}

/**
 * Sanitize plain text (strict mode - no HTML allowed)
 *
 * Use for fields where HTML should never appear:
 * - Names, MRNs, NPIs
 * - IDs, codes
 * - Phone numbers, emails (though these have format validation)
 *
 * @param input - User input
 * @returns Plain text with all HTML/scripts removed
 *
 * @example
 * const firstName = sanitizePlainText('<script>alert("xss")</script>John');
 * // Result: "John"
 */
export function sanitizePlainText(input: string): string {
  return sanitizeHTML(input, SanitizeConfig.STRICT);
}

/**
 * Sanitize rich text (standard mode - safe formatting allowed)
 *
 * Use for fields where basic formatting is helpful:
 * - Patient records
 * - Clinical notes
 * - Medication instructions
 *
 * @param input - User input
 * @returns Text with safe formatting preserved, malicious content removed
 *
 * @example
 * const notes = sanitizeRichText(
 *   'Patient has <b>diabetes</b> and requires <script>alert("xss")</script> monitoring'
 * );
 * // Result: "Patient has <b>diabetes</b> and requires  monitoring"
 */
export function sanitizeRichText(input: string): string {
  return sanitizeHTML(input, SanitizeConfig.STANDARD);
}

/**
 * Sanitize multiple strings in an object
 *
 * Recursively sanitizes all string values in an object.
 * Useful for sanitizing entire form submissions.
 *
 * @param obj - Object with string values to sanitize
 * @param config - Sanitization configuration
 * @returns New object with sanitized values
 *
 * @example
 * const formData = {
 *   firstName: '<script>alert("xss")</script>John',
 *   lastName: 'Doe',
 *   notes: {
 *     medical: 'Patient has <b>diabetes</b><script>evil()</script>'
 *   }
 * };
 *
 * const clean = sanitizeObject(formData, SanitizeConfig.STRICT);
 * // Result: {
 * //   firstName: "John",
 * //   lastName: "Doe",
 * //   notes: { medical: "Patient has diabetes" }
 * // }
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  config: typeof SanitizeConfig.STRICT | typeof SanitizeConfig.STANDARD | typeof SanitizeConfig.PERMISSIVE = SanitizeConfig.STRICT
): T {
  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value, config);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeHTML(item, config)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item, config)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, config);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Check if string contains potential XSS patterns
 *
 * This is a heuristic check, not a substitute for sanitization.
 * Use for logging/monitoring suspicious input.
 *
 * @param input - String to check
 * @returns True if input contains suspicious patterns
 *
 * @example
 * if (containsXSSPatterns(userInput)) {
 *   logger.warn('Potential XSS attempt detected', { input: userInput });
 * }
 */
export function containsXSSPatterns(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script[\s\S]*?>/i, // <script> tags
    /javascript:/i, // javascript: protocol
    /on\w+\s*=/i, // Event handlers (onclick=, onerror=, etc.)
    /<iframe[\s\S]*?>/i, // <iframe> tags
    /<object[\s\S]*?>/i, // <object> tags
    /<embed[\s\S]*?>/i, // <embed> tags
    /eval\(/i, // eval() calls
    /expression\(/i, // CSS expressions
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize patient input data
 *
 * Applies appropriate sanitization to each field based on its type.
 * This is the main function to use in API routes for patient data.
 *
 * @param input - Raw patient input from request
 * @returns Sanitized patient input safe for storage
 *
 * @example
 * // In API route:
 * const body = await req.json();
 * const validatedInput = PatientInputSchema.parse(body);
 * const sanitizedInput = sanitizePatientInput(validatedInput);
 * const result = await patientService.createPatient(sanitizedInput);
 */
export function sanitizePatientInput<T extends Record<string, any>>(input: T): T {
  const sanitized: any = { ...input };

  // Plain text fields (strict sanitization - no HTML allowed)
  const plainTextFields = [
    'firstName',
    'lastName',
    'mrn',
    'npi',
    'gender',
    'phoneNumber',
    'email',
    'insuranceProvider',
    'policyNumber',
    'groupNumber',
    'primaryDiagnosis',
    'medicationName',
    'referringProvider',
    'referringProviderNPI',
  ];

  for (const field of plainTextFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizePlainText(sanitized[field]);
    }
  }

  // Rich text fields (standard sanitization - safe formatting allowed)
  const richTextFields = ['patientRecords', 'address', 'emergencyContact'];

  for (const field of richTextFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeRichText(sanitized[field]);
    }
  }

  // Array fields
  const arrayFields = [
    'additionalDiagnoses',
    'allergies',
    'medicationHistory',
  ];

  for (const field of arrayFields) {
    if (Array.isArray(sanitized[field])) {
      sanitized[field] = sanitized[field].map((item: string) =>
        typeof item === 'string' ? sanitizePlainText(item) : item
      );
    }
  }

  return sanitized as T;
}
