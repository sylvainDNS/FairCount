import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin, c): string => {
    return origin === c.env.FRONTEND_URL ? origin : c.env.FRONTEND_URL;
  },
  credentials: true,
});
