import { Hono } from 'hono';
import { MAGIC_LINK_ERRORS } from '@/shared/constants/errors';
import type { AppEnv } from '../types';

export const authRoutes = new Hono<AppEnv>();

// All auth routes are handled by better-auth
authRoutes.all('/*', async (c) => {
  const auth = c.get('auth');
  const response = await auth.handler(c.req.raw);

  // Handle magic link verification errors - redirect to error page
  // Note: successful verification returns 302 redirect, so we only intercept actual errors (4xx/5xx)
  const pathname = new URL(c.req.url).pathname;
  if (pathname.includes('/magic-link/verify') && response.status >= 400) {
    const errorUrl = new URL('/auth/error', c.env.APP_URL);
    // 410 Gone = token expired, other 4xx/5xx = invalid token
    const errorType =
      response.status === 410 ? MAGIC_LINK_ERRORS.EXPIRED_TOKEN : MAGIC_LINK_ERRORS.INVALID_TOKEN;
    errorUrl.searchParams.set('error', errorType);
    return Response.redirect(errorUrl.toString(), 302);
  }

  return response;
});
