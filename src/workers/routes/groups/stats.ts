import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import * as balanceHandlers from '../../services/balances';
import type { AppEnv } from '../../types';

export const statsRoutes = new Hono<AppEnv>();

// Validation schemas
const statsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']).optional(),
});

// GET /api/groups/:id/stats - Get group statistics
statsRoutes.get('/', zValidator('query', statsQuerySchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!;

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  const { period } = c.req.valid('query');
  return balanceHandlers.getGroupStats(ctx, period);
});
