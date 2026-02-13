import { Hono } from 'hono';
import { MAGIC_LINK_ERRORS } from '@/shared/constants/errors';
import type { AppEnv } from '../types';

export const authRoutes = new Hono<AppEnv>();

// All auth routes are handled by better-auth
// Redirects are rewritten to FRONTEND_URL since API and frontend are on different domains
authRoutes.all('/*', async (c) => {
  const auth = c.get('auth');
  const response = await auth.handler(c.req.raw);

  const pathname = new URL(c.req.url).pathname;

  // Handle magic link verification redirects
  if (pathname.includes('/magic-link/verify')) {
    // Error - redirect to error page
    if (response.status >= 400) {
      const errorUrl = new URL('/auth/error', c.env.FRONTEND_URL);
      const errorType =
        response.status === 410 ? MAGIC_LINK_ERRORS.EXPIRED_TOKEN : MAGIC_LINK_ERRORS.INVALID_TOKEN;
      errorUrl.searchParams.set('error', errorType);
      return Response.redirect(errorUrl.toString(), 302);
    }

    // Handle 302 redirects from better-auth
    if (response.status === 302) {
      const location = response.headers.get('Location');
      const setCookie = response.headers.get('Set-Cookie');

      // No session cookie means verification failed (invalid/used token)
      if (!setCookie) {
        const errorUrl = new URL('/auth/error', c.env.FRONTEND_URL);
        errorUrl.searchParams.set('error', MAGIC_LINK_ERRORS.INVALID_TOKEN);
        return Response.redirect(errorUrl.toString(), 302);
      }

      // Success - rewrite redirect to frontend, keeping cookies
      if (location) {
        const redirectUrl = new URL(location);
        const frontendUrl = new URL(redirectUrl.pathname + redirectUrl.search, c.env.FRONTEND_URL);

        const headers = new Headers();
        headers.set('Location', frontendUrl.toString());
        headers.set('Set-Cookie', setCookie);

        return new Response(null, { status: 302, headers });
      }
    }
  }

  return response;
});
