import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { isValidUUID } from '../../../lib/validation';
import * as settlementHandlers from '../../services/settlements';
import type { AppEnv } from '../../types';

export const settlementsRoutes = new Hono<AppEnv>();

// Validation schemas
const createSettlementSchema = z.object({
  toMember: z.string().uuid(),
  amount: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const settlementsQuerySchema = z.object({
  filter: z.enum(['all', 'sent', 'received']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// GET /api/groups/:id/settlements/suggested - Get optimized suggestions
settlementsRoutes.get('/suggested', async (c) => {
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

  return settlementHandlers.getSuggestedSettlements(ctx);
});

// GET /api/groups/:id/settlements - List settlements
settlementsRoutes.get('/', zValidator('query', settlementsQuerySchema), async (c) => {
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

  const params = c.req.valid('query');

  return settlementHandlers.listSettlements(ctx, params);
});

// POST /api/groups/:id/settlements - Create settlement
settlementsRoutes.post('/', zValidator('json', createSettlementSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!;
  const data = c.req.valid('json');

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return settlementHandlers.createSettlement(ctx, data);
});

// DELETE /api/groups/:id/settlements/:settlementId - Delete settlement
settlementsRoutes.delete('/:settlementId', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!;
  const settlementId = c.req.param('settlementId');

  if (!settlementId || !isValidUUID(settlementId)) {
    return c.json({ error: API_ERROR_CODES.SETTLEMENT_NOT_FOUND }, 404);
  }

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return settlementHandlers.deleteSettlement(ctx, settlementId);
});
