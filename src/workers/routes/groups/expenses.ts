import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { isValidUUID } from '../../../lib/validation';
import { API_ERROR_CODES } from '../../../shared/constants/errors';
import * as expenseHandlers from '../../api/routes/expenses-handlers';
import type { AppEnv } from '../../types';

export const expensesRoutes = new Hono<AppEnv>();

// Validation schemas
const participantSchema = z.object({
  memberId: z.string().uuid(),
  customAmount: z.number().int().min(0).nullable().optional(),
});

const createExpenseSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidBy: z.string().uuid(),
  participants: z.array(participantSchema).min(1),
});

const updateExpenseSchema = z.object({
  amount: z.number().int().positive().optional(),
  description: z.string().min(1).max(500).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  paidBy: z.string().uuid().optional(),
  participants: z.array(participantSchema).min(1).optional(),
});

// GET /api/groups/:id/expenses - List expenses with pagination
expensesRoutes.get('/', async (c) => {
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

  const params = {
    cursor: c.req.query('cursor'),
    limit: c.req.query('limit') ? Number.parseInt(c.req.query('limit') as string, 10) : undefined,
    startDate: c.req.query('startDate'),
    endDate: c.req.query('endDate'),
    paidBy: c.req.query('paidBy'),
    participantId: c.req.query('participantId'),
    search: c.req.query('search'),
  };

  return expenseHandlers.listExpenses(ctx, params);
});

// POST /api/groups/:id/expenses - Create expense
expensesRoutes.post('/', zValidator('json', createExpenseSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!; // Safe because mounted under /:id
  const data = c.req.valid('json');

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return expenseHandlers.createExpense(ctx, data);
});

// GET /api/groups/:id/expenses/:expenseId - Get expense details
expensesRoutes.get('/:expenseId', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!; // Safe because mounted under /:id
  const expenseId = c.req.param('expenseId');

  if (!expenseId || !isValidUUID(expenseId)) {
    return c.json({ error: API_ERROR_CODES.EXPENSE_NOT_FOUND }, 404);
  }

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return expenseHandlers.getExpense(ctx, expenseId);
});

// PATCH /api/groups/:id/expenses/:expenseId - Update expense
expensesRoutes.patch('/:expenseId', zValidator('json', updateExpenseSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!; // Safe because mounted under /:id
  const expenseId = c.req.param('expenseId');
  const data = c.req.valid('json');

  if (!expenseId || !isValidUUID(expenseId)) {
    return c.json({ error: API_ERROR_CODES.EXPENSE_NOT_FOUND }, 404);
  }

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return expenseHandlers.updateExpense(ctx, expenseId, data);
});

// DELETE /api/groups/:id/expenses/:expenseId - Delete expense
expensesRoutes.delete('/:expenseId', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const membership = c.get('membership');
  const groupId = c.req.param('id')!; // Safe because mounted under /:id
  const expenseId = c.req.param('expenseId');

  if (!expenseId || !isValidUUID(expenseId)) {
    return c.json({ error: API_ERROR_CODES.EXPENSE_NOT_FOUND }, 404);
  }

  const ctx = {
    db,
    groupId,
    userId: user.id,
    currentMemberId: membership.id,
  };

  return expenseHandlers.deleteExpense(ctx, expenseId);
});
