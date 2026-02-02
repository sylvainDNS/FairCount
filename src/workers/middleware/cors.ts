import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin, c): string => {
    const allowedOrigins = [c.env.APP_URL, 'http://localhost:3000', 'http://localhost:5173'];
    return allowedOrigins.includes(origin) ? origin : c.env.APP_URL;
  },
  credentials: true,
});
