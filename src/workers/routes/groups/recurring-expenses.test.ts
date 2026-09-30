import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../db';
import type { AppEnv } from '../../types';
import { recurringExpensesRoutes } from './recurring-expenses';

const service = vi.hoisted(() => ({
  createRecurringExpense: vi.fn(),
  listRecurringExpenses: vi.fn(),
  getRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deactivateRecurringExpense: vi.fn(),
  reactivateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
}));

vi.mock('../../services/recurring-expenses', () => service);

const GROUP_ID = '0b1f5c1e-3c1d-4b8a-9d8e-2f6a5b4c3d2e';
const MEMBER_ID = '8f14e45f-ceea-4e67-9d8f-6c5a1b2c3d4e';
const RECURRENCE_ID = '5d41402a-bc4b-4a76-b971-9d911017c592';

// Services are mocked: the db stub is never queried
const dbStub = {} as Database;

const buildApp = () => {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('db', dbStub);
    c.set('user', { id: 'user-1', email: 'alex@example.com' });
    c.set('membership', {
      id: MEMBER_ID,
      groupId: GROUP_ID,
      userId: 'user-1',
      name: 'Alex',
      email: 'alex@example.com',
      income: 0,
      coefficient: 10000,
      joinedAt: new Date(),
      leftAt: null,
    });
    await next();
  });
  app.route('/groups/:id/recurring-expenses', recurringExpensesRoutes);
  return app;
};

const url = (path = '') => `/groups/${GROUP_ID}/recurring-expenses${path}`;

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const validBody = {
  amount: 85000,
  description: 'Loyer',
  paidBy: MEMBER_ID,
  participants: [{ memberId: MEMBER_ID, customAmount: null }],
  startDate: '2099-10-01',
  rule: { frequency: 'monthly', dayOfMonth: 1 },
};

describe('recurring-expenses routes', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) fn.mockReset();
  });

  describe('POST /', () => {
    it.each([
      ['a missing rule', { ...validBody, rule: undefined }],
      ['weekly without dayOfWeek', { ...validBody, rule: { frequency: 'weekly' } }],
      ['amount 0', { ...validBody, amount: 0 }],
      ['an unknown groupId field', { ...validBody, groupId: GROUP_ID }],
    ])('rejects %s with 400 without calling the service', async (_label, body) => {
      const res = await buildApp().request(url(), json('POST', body));
      expect(res.status).toBe(400);
      expect(service.createRecurringExpense).not.toHaveBeenCalled();
    });

    it('passes the parsed body to the service and returns its response', async () => {
      service.createRecurringExpense.mockResolvedValue(
        Response.json(
          { id: RECURRENCE_ID, nextDueDate: '2099-10-01', generatedExpenseId: null },
          {
            status: 201,
          },
        ),
      );

      const res = await buildApp().request(url(), json('POST', validBody));

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        id: RECURRENCE_ID,
        nextDueDate: '2099-10-01',
        generatedExpenseId: null,
      });
      expect(service.createRecurringExpense).toHaveBeenCalledWith(
        { db: dbStub, groupId: GROUP_ID, userId: 'user-1', currentMemberId: MEMBER_ID },
        validBody,
      );
    });
  });
});

describe('recurring-expenses routes — read', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) fn.mockReset();
  });

  it('GET / lists the recurrences of the group', async () => {
    service.listRecurringExpenses.mockResolvedValue(Response.json({ recurringExpenses: [] }));
    const res = await buildApp().request(url());
    expect(res.status).toBe(200);
    expect(service.listRecurringExpenses).toHaveBeenCalledWith({
      db: dbStub,
      groupId: GROUP_ID,
      userId: 'user-1',
      currentMemberId: MEMBER_ID,
    });
  });

  it('GET /:id rejects a non-UUID id with 404 without calling the service', async () => {
    const res = await buildApp().request(url('/not-a-uuid'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'RECURRING_EXPENSE_NOT_FOUND' });
    expect(service.getRecurringExpense).not.toHaveBeenCalled();
  });

  it('GET /:id passes a valid id to the service', async () => {
    service.getRecurringExpense.mockResolvedValue(Response.json({ id: RECURRENCE_ID }));
    const res = await buildApp().request(url(`/${RECURRENCE_ID}`));
    expect(res.status).toBe(200);
    expect(service.getRecurringExpense).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: GROUP_ID }),
      RECURRENCE_ID,
    );
  });
});

describe('recurring-expenses routes — manage', () => {
  beforeEach(() => {
    for (const fn of Object.values(service)) {
      fn.mockReset().mockResolvedValue(Response.json({ success: true }));
    }
  });

  it('PATCH rejects an empty body, startDate and groupId', async () => {
    for (const body of [{}, { startDate: '2099-01-01' }, { groupId: GROUP_ID }]) {
      const res = await buildApp().request(url(`/${RECURRENCE_ID}`), json('PATCH', body));
      expect(res.status).toBe(400);
    }
    expect(service.updateRecurringExpense).not.toHaveBeenCalled();
  });

  it('PATCH passes the parsed body to the service', async () => {
    const res = await buildApp().request(
      url(`/${RECURRENCE_ID}`),
      json('PATCH', { amount: 88000 }),
    );
    expect(res.status).toBe(200);
    expect(service.updateRecurringExpense).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: GROUP_ID, currentMemberId: MEMBER_ID }),
      RECURRENCE_ID,
      { amount: 88000 },
    );
  });

  it.each([
    ['POST', '/deactivate', 'deactivateRecurringExpense'],
    ['POST', '/reactivate', 'reactivateRecurringExpense'],
    ['DELETE', '', 'deleteRecurringExpense'],
  ] as const)('%s /:id%s calls %s', async (method, suffix, handler) => {
    const res = await buildApp().request(url(`/${RECURRENCE_ID}${suffix}`), { method });
    expect(res.status).toBe(200);
    expect(service[handler]).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: GROUP_ID }),
      RECURRENCE_ID,
    );
  });

  it.each([
    ['PATCH', '', { amount: 1 }],
    ['POST', '/deactivate', undefined],
    ['POST', '/reactivate', undefined],
    ['DELETE', '', undefined],
  ] as const)('%s /not-a-uuid%s → 404', async (method, suffix, body) => {
    const init = body ? json(method, body) : { method };
    const res = await buildApp().request(url(`/not-a-uuid${suffix}`), init);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'RECURRING_EXPENSE_NOT_FOUND' });
  });
});
