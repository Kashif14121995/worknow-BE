import { Transform } from 'class-transformer';

/**
 * Decorator to sanitize string input
 * Removes HTML tags and dangerous characters
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Basic sanitization - remove HTML tags and dangerous characters
      return value
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '') // Remove remaining angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers (onclick, onerror, etc.)
        .trim();
    }
    return value;
  });
}
