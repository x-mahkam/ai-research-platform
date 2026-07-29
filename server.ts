import express from 'express';
import path from 'path';
import { config } from './backend/configuration/index.js';
import { logger } from './backend/logging/logger.js';
import { createApiApp } from './backend/app.js';

async function startServer() {
  const app = await createApiApp();

  // Vite development server / Static asset production server
  if (process.env.NODE_ENV !== 'production') {
    // Import Vite lazily so the production bundle never requires it at runtime
    // (Vite is a devDependency and is absent from a production install).
    const { createServer: createViteServer } = await import('vite');
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

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`[${config.serviceName} v${config.version}] Backend running on http://0.0.0.0:${config.port}`);
  });
}

startServer();
