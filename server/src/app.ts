import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './routes/auth';
import { itemsRouter } from './routes/items';
import { cartRouter } from './routes/cart';
import { ordersRouter } from './routes/orders';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/items', requireAuth, itemsRouter);
  app.use('/api/cart', requireAuth, cartRouter);
  app.use('/api/orders', requireAuth, ordersRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
