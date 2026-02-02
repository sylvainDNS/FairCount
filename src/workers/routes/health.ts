import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const healthRoute = new Hono<AppEnv>();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: c.env.APP_NAME,
    timestamp: new Date().toISOString(),
  });
});
