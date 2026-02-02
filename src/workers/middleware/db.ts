import { createMiddleware } from 'hono/factory';
import { createDb } from '../../db';
import { createAuth } from '../../lib/auth';
import type { AppEnv } from '../types';

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env.DB);
  const auth = createAuth({ db, env: c.env });

  c.set('db', db);
  c.set('auth', auth);

  await next();
});
