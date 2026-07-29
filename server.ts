import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './backend/configuration/index.js';
import { logger } from './backend/logging/logger.js';
import { createApiApp } from './backend/app.js';

// Surface anything that would otherwise crash or hang the process silently —
// on a host like Render this makes the real cause visible in the logs.
process.on('unhandledRejection', (reason) => {
  logger.error(`[FATAL] Unhandled promise rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`[FATAL] Uncaught exception: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});

async function startServer() {
  logger.info(`[Startup] Booting ${config.serviceName} v${config.version} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);

  logger.info('[Startup] Initializing application container (database, migrations, plugins)...');
  const app = await createApiApp();
  logger.info('[Startup] Container ready.');

  // Vite development server / Static asset production server
  if (process.env.NODE_ENV !== 'production') {
    // Import Vite lazily so the production bundle never requires it at runtime
    // (Vite is a devDependency and is absent from a production install).
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          // Runtime data lives inside the project dir; don't let writes to the
          // database or per-run workspaces trigger a dev-server page reload.
          ignored: ['**/storage/**', '**/workspaces/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      logger.error(`[Startup] Production build missing at ${indexPath}. Did "npm run build" run? The API will still serve, but the web UI will not.`);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          logger.error(`[Static] Failed to serve index.html: ${err.message}`);
          if (!res.headersSent) res.status(500).send('Web UI is unavailable. Check server build.');
        }
      });
    });
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`[${config.serviceName} v${config.version}] Backend running on http://0.0.0.0:${config.port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.error(`[FATAL] HTTP server error (${err.code || 'unknown'}): ${err.message}`);
    process.exit(1);
  });
}

startServer().catch((err) => {
  logger.error(`[FATAL] Server failed to start: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
