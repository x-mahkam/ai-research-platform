import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { config } from './backend/configuration/index.js';
import { logger } from './backend/logging/logger.js';
import { container } from './backend/core/container.js';
import { requestLogger, securityMiddleware, errorHandler } from './backend/api/middleware/index.js';
import apiRouter from './backend/api/routes/index.js';

async function startServer() {
  const app = express();

  // Initialize DB & Container
  await container.initialize();

  // Core express middleware
  app.use(express.json());
  app.use(requestLogger);
  app.use(securityMiddleware);

  // Enterprise API Routes Layer (/api)
  app.use('/api', apiRouter);

  // Vite development server / Static asset production server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`[${config.serviceName} v${config.version}] Backend running on http://0.0.0.0:${config.port}`);
  });
}

startServer();
