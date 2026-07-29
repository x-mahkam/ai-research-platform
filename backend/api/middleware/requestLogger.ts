import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('HTTP');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
}
