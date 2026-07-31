import express, { type Express } from 'express';
import { container } from './core/container.js';
import { requestLogger, securityMiddleware, errorHandler } from './api/middleware/index.js';
import apiRouter from './api/routes/index.js';
import { aiProviderRegistry } from './ai/providers/index.js';

/**
 * Builds the API-only Express app (JSON parsing, logging, security headers,
 * the /api router, and the centralized error handler). It does NOT mount Vite
 * or static file serving, so it can be exercised directly by integration tests
 * without pulling in dev-only tooling.
 */
export async function createApiApp(): Promise<Express> {
  const app = express();

  await container.initialize();

  // Report which AI providers are active — the "did I set my API keys?" check.
  aiProviderRegistry.logStartupStatus();

  // Model files (uploaded content) can be much larger than Express's 100kb
  // default, which otherwise fails uploads with "request entity too large".
  app.use(express.json({ limit: '50mb' }));
  app.use(requestLogger);
  app.use(securityMiddleware);
  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
}
