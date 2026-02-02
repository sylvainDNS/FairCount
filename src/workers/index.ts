import { createDb } from '../db';
import { createAuth } from '../lib/auth';
import { handleGroupsRoutes } from './api/routes/groups';
import { handleInvitationsRoutes } from './api/routes/invitations';
import type { Env } from './types';

// Magic link verification error codes
const MAGIC_LINK_ERRORS = {
  EXPIRED_TOKEN: 'expired',
  INVALID_TOKEN: 'invalid_token',
} as const;

const getAllowedOrigin = (request: Request, env: Env): string => {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [env.APP_URL, 'http://localhost:3000', 'http://localhost:5173'];

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return env.APP_URL;
};

const getCorsHeaders = (request: Request, env: Env): Record<string, string> => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(request, env),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
});

const handleCors = (request: Request, env: Env): Response | null => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(request, env) });
  }
  return null;
};

const addCorsHeaders = (response: Response, request: Request, env: Env): Response => {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;

    try {
      const url = new URL(request.url);

      // Health check
      if (url.pathname === '/api/health') {
        return addCorsHeaders(
          Response.json({
            status: 'ok',
            app: env.APP_NAME,
            timestamp: new Date().toISOString(),
          }),
          request,
          env,
        );
      }

      // Auth routes - handled by better-auth
      if (url.pathname.startsWith('/api/auth')) {
        const db = createDb(env.DB);
        const auth = createAuth({ db, env });
        const response = await auth.handler(request);

        // Handle magic link verification errors - redirect to error page
        // Note: successful verification returns 302 redirect, so we only intercept actual errors (4xx/5xx)
        if (url.pathname.includes('/magic-link/verify') && response.status >= 400) {
          const errorUrl = new URL('/auth/error', env.APP_URL);
          // 410 Gone = token expired, other 4xx/5xx = invalid token
          const errorType =
            response.status === 410 ? MAGIC_LINK_ERRORS.EXPIRED_TOKEN : MAGIC_LINK_ERRORS.INVALID_TOKEN;
          errorUrl.searchParams.set('error', errorType);
          return Response.redirect(errorUrl.toString(), 302);
        }

        return addCorsHeaders(response, request, env);
      }

      // Groups routes
      if (url.pathname.startsWith('/api/groups')) {
        const db = createDb(env.DB);
        const auth = createAuth({ db, env });
        const response = await handleGroupsRoutes(request, { db, auth, env });
        return addCorsHeaders(response, request, env);
      }

      // Invitations routes (public endpoint for invitation details)
      if (url.pathname.startsWith('/api/invitations')) {
        const db = createDb(env.DB);
        const auth = createAuth({ db, env });
        const response = await handleInvitationsRoutes(request, { db, auth, env });
        return addCorsHeaders(response, request, env);
      }

      // API routes - 404 for unknown routes
      if (url.pathname.startsWith('/api/')) {
        return addCorsHeaders(Response.json({ error: 'NOT_FOUND' }, { status: 404 }), request, env);
      }

      return addCorsHeaders(Response.json({ error: 'NOT_FOUND' }, { status: 404 }), request, env);
    } catch (error) {
      console.error('Worker error:', error);
      return addCorsHeaders(
        Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 }),
        request,
        env,
      );
    }
  },
};
