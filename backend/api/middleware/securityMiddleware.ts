import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../../security/securityService.js';

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  SecurityService.applySecurityHeaders(req, res, next);
}
