import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('ErrorHandler');

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(`Operational Error: ${err.message}`, { path: req.path, statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  logger.error(`Unhandled Exception: ${err.message}`, { stack: err.stack, path: req.path });
  res.status(500).json({
    error: 'Internal Server Error',
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
}
