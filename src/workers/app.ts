import { Hono } from 'hono';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { corsMiddleware, dbMiddleware, errorHandler } from './middleware';
import { authRoutes, groupsRoutes, healthRoute, invitationsRoutes } from './routes';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware on all routes
app.use('*', corsMiddleware);

// Apply database/auth middleware on API routes
app.use('/api/*', dbMiddleware);

// Global error handler
app.onError(errorHandler);

// Mount routes
app.route('/api/health', healthRoute);
app.route('/api/auth', authRoutes);
app.route('/api/groups', groupsRoutes);
app.route('/api/invitations', invitationsRoutes);

// 404 catch-all
app.notFound((c) => {
  return c.json({ error: API_ERROR_CODES.NOT_FOUND }, 404);
});

export default app;
