import { Hono } from 'hono';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { corsMiddleware, dbMiddleware, errorHandler } from './middleware';
import { authRoutes, groupsRoutes, healthRoute, invitationsRoutes, userRoutes } from './routes';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware on all routes
app.use('*', corsMiddleware);

// Apply database/auth middleware on all routes
app.use('/*', dbMiddleware);

// Global error handler
app.onError(errorHandler);

// Mount routes
app.route('/health', healthRoute);
app.route('/auth', authRoutes);
app.route('/user', userRoutes);
app.route('/groups', groupsRoutes);
app.route('/invitations', invitationsRoutes);

// 404 catch-all
app.notFound((c) => {
  return c.json({ error: API_ERROR_CODES.NOT_FOUND }, 404);
});

export default app;
