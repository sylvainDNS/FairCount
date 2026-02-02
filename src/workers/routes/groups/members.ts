import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { isValidUUID } from '../../../lib/validation';
import * as memberHandlers from '../../api/routes/members-handlers';
import type { AppEnv } from '../../types';

export const membersRoutes = new Hono<AppEnv>();

// Validation schemas
const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  income: z.number().int().min(0).optional(),
});

// GET /api/groups/:id/members - List members
membersRoutes.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;

  const ctx = { db, groupId, userId: user.id };
  return memberHandlers.listMembers(ctx);
});

// GET /api/groups/:id/members/me - Get my membership
membersRoutes.get('/me', async (c) => {
  const membership = c.get('membership');
  const user = c.get('user');

  return c.json({
    id: membership.id,
    name: membership.name,
    email: membership.email,
    userId: membership.userId,
    income: membership.income,
    coefficient: membership.coefficient,
    joinedAt: membership.joinedAt,
    isCurrentUser: membership.userId === user.id,
  });
});

// PATCH /api/groups/:id/members/me - Update my membership
membersRoutes.patch('/me', zValidator('json', updateMemberSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const data = c.req.valid('json');

  const ctx = { db, groupId, userId: user.id };
  return memberHandlers.updateMyMembership(ctx, data);
});

// GET /api/groups/:id/members/:memberId - Get member details
membersRoutes.get('/:memberId', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const memberId = c.req.param('memberId');

  if (!memberId || !isValidUUID(memberId)) {
    return c.json({ error: API_ERROR_CODES.MEMBER_NOT_FOUND }, 404);
  }

  const ctx = { db, groupId, userId: user.id };
  return memberHandlers.getMember(ctx, memberId);
});

// PATCH /api/groups/:id/members/:memberId - Update member
membersRoutes.patch('/:memberId', zValidator('json', updateMemberSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const memberId = c.req.param('memberId');
  const data = c.req.valid('json');

  if (!memberId || !isValidUUID(memberId)) {
    return c.json({ error: API_ERROR_CODES.MEMBER_NOT_FOUND }, 404);
  }

  const ctx = { db, groupId, userId: user.id };
  return memberHandlers.updateMember(ctx, memberId, data);
});

// DELETE /api/groups/:id/members/:memberId - Remove member
membersRoutes.delete('/:memberId', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;
  const memberId = c.req.param('memberId');

  if (!memberId || !isValidUUID(memberId)) {
    return c.json({ error: API_ERROR_CODES.MEMBER_NOT_FOUND }, 404);
  }

  const ctx = { db, groupId, userId: user.id };
  return memberHandlers.removeMember(ctx, memberId);
});
