import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL;
    if (!frontendUrl || origin !== frontendUrl) {
      return null;
    }
    return origin;
  },
  allowHeaders: ['Content-Type'],
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  credentials: true,
  maxAge: 600,
});
