import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('Security');

export class SecurityService {
  public static validatePayloadSize(maxKb: number = 500) {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > maxKb * 1024) {
        logger.warn(`Payload size exceeded limit: ${contentLength} bytes`);
        return res.status(413).json({
          error: 'Payload Too Large',
          details: `Request body exceeds maximum size limit of ${maxKb}KB.`,
        });
      }
      next();
    };
  }

  public static applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-ARP-Service-Layer', 'Enterprise-Layered-Architecture');
    next();
  }
}
