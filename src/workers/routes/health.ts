import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const healthRoute = new Hono<AppEnv>();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    app: c.env.APP_NAME,
    version: c.env.GIT_SHA ?? 'dev',
    buildDate: c.env.BUILD_DATE ?? null,
    timestamp: new Date().toISOString(),
  });
});
