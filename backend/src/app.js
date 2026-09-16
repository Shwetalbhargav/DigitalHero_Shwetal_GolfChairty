import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { createRoutes } from './routes/index.js';
import { ApiError } from './utils/ApiError.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
export function createApp({ config, database, isShuttingDown }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    req.id = randomUUID();
    res.set('X-Request-ID', req.id);
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(
          origin && origin !== config.clientOrigin
            ? new ApiError(
                403,
                'ORIGIN_NOT_ALLOWED',
                'Request origin is not allowed.',
              )
            : null,
          config.clientOrigin,
        );
      },
      credentials: true,
      exposedHeaders: ['X-Request-ID'],
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', createRoutes({ database, isShuttingDown }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
