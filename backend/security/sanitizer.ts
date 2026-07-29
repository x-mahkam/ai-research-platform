export class InputSanitizer {
  public static sanitizeString(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  public static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized: Record<string, any> = { ...obj };
    for (const key of Object.keys(sanitized)) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = InputSanitizer.sanitizeString(sanitized[key]);
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = InputSanitizer.sanitizeObject(sanitized[key]);
      }
    }
    return sanitized as T;
  }
}
