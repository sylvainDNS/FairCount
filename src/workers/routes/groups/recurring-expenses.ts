import { zValidator } from '@hono/zod-validator';
import { type Context, Hono } from 'hono';
import {
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
} from '@/lib/schemas/recurring-expense.schema';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { isValidUUID } from '../../../lib/validation';
import * as recurringExpenseHandlers from '../../services/recurring-expenses';
import type { AppEnv } from '../../types';

export const recurringExpensesRoutes = new Hono<AppEnv>();

type RouteContext = Context<AppEnv>;

const contextOf = (c: RouteContext) => ({
  db: c.get('db'),
  groupId: c.req.param('id') ?? '', // always set: mounted under /:id
  userId: c.get('user').id,
  currentMemberId: c.get('membership').id,
});

const notFound = (c: RouteContext) =>
  c.json({ error: API_ERROR_CODES.RECURRING_EXPENSE_NOT_FOUND }, 404);

// GET /api/groups/:id/recurring-expenses - List the group's recurrences
recurringExpensesRoutes.get('/', (c) =>
  recurringExpenseHandlers.listRecurringExpenses(contextOf(c)),
);

// GET /api/groups/:id/recurring-expenses/:recurringExpenseId - Recurrence detail
recurringExpensesRoutes.get('/:recurringExpenseId', (c) => {
  const id = c.req.param('recurringExpenseId');
  if (!isValidUUID(id)) return notFound(c);
  return recurringExpenseHandlers.getRecurringExpense(contextOf(c), id);
});

// POST /api/groups/:id/recurring-expenses - Create a recurrence
recurringExpensesRoutes.post('/', zValidator('json', createRecurringExpenseSchema), (c) =>
  recurringExpenseHandlers.createRecurringExpense(contextOf(c), c.req.valid('json')),
);

// PATCH /api/groups/:id/recurring-expenses/:recurringExpenseId - Edit (future échéances only)
recurringExpensesRoutes.patch(
  '/:recurringExpenseId',
  // Unknown ids are 404 before body validation
  async (c, next) => (isValidUUID(c.req.param('recurringExpenseId')) ? next() : notFound(c)),
  zValidator('json', updateRecurringExpenseSchema),
  (c) =>
    recurringExpenseHandlers.updateRecurringExpense(
      contextOf(c),
      c.req.param('recurringExpenseId'),
      c.req.valid('json'),
    ),
);

// Any active member may act on any recurrence of the group (FR-021): no ownership check
const action =
  (handler: (ctx: ReturnType<typeof contextOf>, id: string) => Promise<Response>) =>
  (c: RouteContext) => {
    const id = c.req.param('recurringExpenseId') ?? '';
    if (!isValidUUID(id)) return notFound(c);
    return handler(contextOf(c), id);
  };

// POST /api/groups/:id/recurring-expenses/:recurringExpenseId/deactivate
recurringExpensesRoutes.post(
  '/:recurringExpenseId/deactivate',
  action(recurringExpenseHandlers.deactivateRecurringExpense),
);

// POST /api/groups/:id/recurring-expenses/:recurringExpenseId/reactivate
recurringExpensesRoutes.post(
  '/:recurringExpenseId/reactivate',
  action(recurringExpenseHandlers.reactivateRecurringExpense),
);

// DELETE /api/groups/:id/recurring-expenses/:recurringExpenseId - Soft delete
recurringExpensesRoutes.delete(
  '/:recurringExpenseId',
  action(recurringExpenseHandlers.deleteRecurringExpense),
);
