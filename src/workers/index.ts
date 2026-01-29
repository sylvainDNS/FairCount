import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  // D1 Database
  DB: D1Database;
  // R2 Storage
  STORAGE: R2Bucket;
  // Environment variables
  APP_URL: string;
  APP_NAME: string;
  // Secrets
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({
        status: 'ok',
        app: env.APP_NAME,
        timestamp: new Date().toISOString(),
      });
    }

    // API routes will be added here
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
