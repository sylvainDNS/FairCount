import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { API_ERROR_CODES } from '../../shared/constants/errors';
import type { AppEnv } from '../types';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.get('auth');
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    throw new HTTPException(401, { message: API_ERROR_CODES.UNAUTHORIZED });
  }

  c.set('user', session.user);
  c.set('session', session.session);

  await next();
});
