/**
 * Sanitization Utility Tests
 *
 * Critical security tests for XSS protection.
 * These tests verify that malicious content is properly sanitized.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeMarkdown,
  sanitizePlainText,
  validateContentSecurity,
} from '@/lib/utils/sanitize';

describe('sanitizeMarkdown', () => {
  describe('safe content', () => {
    it('preserves safe markdown text', () => {
      const input = '# Hello World\n\nThis is **bold** and this is *italic*.';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('Hello World');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
    });

    it('preserves safe HTML headings', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<h2>Subtitle</h2>');
    });

    it('preserves safe lists', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
    });

    it('preserves safe links with https', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Link');
    });

    it('preserves code blocks', () => {
      const input = '<code>const x = 1;</code>';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('<code>');
      expect(result).toContain('const x = 1;');
    });

    it('preserves tables', () => {
      const input = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<td>Cell</td>');
    });
  });

  describe('XSS attack prevention', () => {
    it('removes script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
    });

    it('removes inline event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    it('removes javascript: protocol in links', () => {
      const input = '<a href="javascript:alert(1)">Bad Link</a>';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('removes onerror handlers on images', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('removes data: protocol URLs', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">Link</a>';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('data:');
    });

    it('removes iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Hello';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('evil.com');
      expect(result).toContain('Hello');
    });

    it('removes object tags', () => {
      const input = '<object data="malicious.swf"></object>Hello';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('<object>');
      expect(result).toContain('Hello');
    });

    it('removes embed tags', () => {
      const input = '<embed src="evil.swf">Hello';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('<embed>');
      expect(result).toContain('Hello');
    });

    it('removes inline styles', () => {
      const input = '<div style="background: url(javascript:alert(1))">Text</div>';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('style=');
      expect(result).not.toContain('javascript:');
    });

    it('handles complex nested XSS attempts', () => {
      const input = '<div><script>alert(1)</script><img src=x onerror="alert(2)">Safe text</div>';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe text');
    });

    it('handles encoded XSS attempts', () => {
      const input = '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('onerror');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = sanitizeMarkdown('');
      expect(result).toBe('');
    });

    it('handles whitespace only', () => {
      const result = sanitizeMarkdown('   \n\t  ');
      expect(result).toBe('   \n\t  ');
    });

    it('handles very long content', () => {
      const longText = 'a'.repeat(10000);
      const result = sanitizeMarkdown(longText);
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles special characters', () => {
      const input = '<>&"\'';
      const result = sanitizeMarkdown(input);
      expect(result).toBeTruthy();
    });
  });
});

describe('sanitizePlainText', () => {
  it('strips all HTML tags', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizePlainText(input);
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
    expect(result).toContain('Hello World');
  });

  it('removes script tags and content', () => {
    const input = 'Text <script>alert(1)</script> More text';
    const result = sanitizePlainText(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Text');
    expect(result).toContain('More text');
  });

  it('preserves plain text content', () => {
    const input = 'John Smith';
    const result = sanitizePlainText(input);
    expect(result).toBe('John Smith');
  });

  it('handles patient names with special characters', () => {
    const input = "O'Brien <script>alert(1)</script>";
    const result = sanitizePlainText(input);
    expect(result).toContain("O'Brien");
    expect(result).not.toContain('script');
  });

  it('handles empty string', () => {
    const result = sanitizePlainText('');
    expect(result).toBe('');
  });
});

describe('validateContentSecurity', () => {
  it('returns safe for clean content', () => {
    const result = validateContentSecurity('This is safe content');
    expect(result.safe).toBe(true);
    expect(result.threats).toEqual([]);
  });

  it('detects script tags', () => {
    const result = validateContentSecurity('<script>alert(1)</script>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('script tag');
  });

  it('detects javascript: protocol', () => {
    const result = validateContentSecurity('<a href="javascript:alert(1)">Link</a>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('javascript: protocol');
  });

  it('detects event handlers', () => {
    const result = validateContentSecurity('<div onclick="alert(1)">Click</div>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('event handler');
  });

  it('detects iframe tags', () => {
    const result = validateContentSecurity('<iframe src="evil.com"></iframe>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('iframe tag');
  });

  it('detects object tags', () => {
    const result = validateContentSecurity('<object data="malicious"></object>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('object tag');
  });

  it('detects embed tags', () => {
    const result = validateContentSecurity('<embed src="evil">');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('embed tag');
  });

  it('detects eval() calls', () => {
    const result = validateContentSecurity('eval("malicious code")');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('eval() call');
  });

  it('detects CSS expressions', () => {
    const result = validateContentSecurity('style="width: expression(alert(1))"');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('CSS expression');
  });

  it('detects multiple threats', () => {
    const result = validateContentSecurity('<script>eval()</script><iframe></iframe>');
    expect(result.safe).toBe(false);
    expect(result.threats.length).toBeGreaterThan(1);
    expect(result.threats).toContain('script tag');
    expect(result.threats).toContain('iframe tag');
    expect(result.threats).toContain('eval() call');
  });

  it('is case insensitive', () => {
    const result = validateContentSecurity('<SCRIPT>alert(1)</SCRIPT>');
    expect(result.safe).toBe(false);
    expect(result.threats).toContain('script tag');
  });
});
