import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../db';
import type { AppEnv } from '../../types';
import { expensesRoutes } from './expenses';

const service = vi.hoisted(() => ({
  listExpenses: vi.fn(),
  getExpense: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

vi.mock('../../services/expenses', () => service);

const GROUP_ID = '0b1f5c1e-3c1d-4b8a-9d8e-2f6a5b4c3d2e';
const MEMBER_ID = '8f14e45f-ceea-4e67-9d8f-6c5a1b2c3d4e';

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
  app.route('/groups/:id/expenses', expensesRoutes);
  return app;
};

const listParams = () => service.listExpenses.mock.calls[0]?.[1];

describe('GET /groups/:id/expenses — recurring filter', () => {
  beforeEach(() => {
    service.listExpenses.mockReset().mockResolvedValue(Response.json({ expenses: [] }));
  });

  it('passes recurring: true only for ?recurring=true', async () => {
    await buildApp().request(`/groups/${GROUP_ID}/expenses?recurring=true`);
    expect(listParams()).toMatchObject({ recurring: true });
  });

  it.each(['?recurring=false', '?recurring=1', ''])(
    'passes recurring: false for "%s"',
    async (qs) => {
      await buildApp().request(`/groups/${GROUP_ID}/expenses${qs}`);
      expect(listParams()).toMatchObject({ recurring: false });
    },
  );

  it('still passes the existing filters through', async () => {
    await buildApp().request(
      `/groups/${GROUP_ID}/expenses?startDate=2026-09-01&paidBy=${MEMBER_ID}&search=loyer`,
    );
    expect(listParams()).toMatchObject({
      startDate: '2026-09-01',
      paidBy: MEMBER_ID,
      search: 'loyer',
    });
  });
});
