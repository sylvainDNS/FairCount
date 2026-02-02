import { Hono } from 'hono';
import * as balanceHandlers from '../../api/routes/balances-handlers';
import type { AppEnv } from '../../types';

export const balancesRoutes = new Hono<AppEnv>();

// GET /api/groups/:id/balances - List all balances
balancesRoutes.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!; // Safe because mounted under /:id

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return balanceHandlers.listBalances(ctx);
});

// GET /api/groups/:id/balances/me - Get my balance detail
balancesRoutes.get('/me', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!; // Safe because mounted under /:id

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return balanceHandlers.getMyBalance(ctx);
});
