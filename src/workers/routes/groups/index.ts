import { zValidator } from '@hono/zod-validator';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { API_ERROR_CODES } from '@/shared/constants/errors';
import { resolveInitialMemberName } from '../../services/shared/sql-helpers';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';
import { authMiddleware, membershipMiddleware } from '../../middleware';
import { calculateShares } from '../../services/shared/share-calculation';
import { memberDisplayName } from '../../services/shared/sql-helpers';
import type { AppEnv } from '../../types';
import { balancesRoutes } from './balances';
import { expensesRoutes } from './expenses';
import { invitationsRoutes } from './invitations';
import { membersRoutes } from './members';
import { settlementsRoutes } from './settlements';
import { statsRoutes } from './stats';

export const groupsRoutes = new Hono<AppEnv>();

// Apply auth middleware on all routes
groupsRoutes.use('*', authMiddleware);

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).optional().default('EUR'),
  incomeFrequency: z.enum(['annual', 'monthly']).optional().default('annual'),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  incomeFrequency: z.enum(['annual', 'monthly']).optional(),
});

// List user's groups
async function listGroups(db: Database, userId: string) {
  // Get user's groups with their memberId
  const userGroups = await db
    .select({
      id: schema.groups.id,
      name: schema.groups.name,
      description: schema.groups.description,
      currency: schema.groups.currency,
      incomeFrequency: schema.groups.incomeFrequency,
      archivedAt: schema.groups.archivedAt,
      createdAt: schema.groups.createdAt,
      memberId: schema.groupMembers.id,
    })
    .from(schema.groups)
    .innerJoin(schema.groupMembers, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(and(eq(schema.groupMembers.userId, userId), isNull(schema.groupMembers.leftAt)));

  if (userGroups.length === 0) {
    return [];
  }

  const groupIds = userGroups.map((g) => g.id);
  const memberIdByGroup = new Map(userGroups.map((g) => [g.id, g.memberId]));

  // Get member counts for all groups in a single query
  const memberCounts = await db
    .select({
      groupId: schema.groupMembers.groupId,
      count: count(),
    })
    .from(schema.groupMembers)
    .where(and(inArray(schema.groupMembers.groupId, groupIds), isNull(schema.groupMembers.leftAt)))
    .groupBy(schema.groupMembers.groupId);

  const countMap = new Map(memberCounts.map((mc) => [mc.groupId, mc.count]));

  // Get all members for coefficient calculation
  const allMembers = await db
    .select({
      id: schema.groupMembers.id,
      groupId: schema.groupMembers.groupId,
      coefficient: schema.groupMembers.coefficient,
    })
    .from(schema.groupMembers)
    .where(and(inArray(schema.groupMembers.groupId, groupIds), isNull(schema.groupMembers.leftAt)));

  const membersByGroup = new Map<string, Map<string, number>>();
  for (const m of allMembers) {
    const groupMap = membersByGroup.get(m.groupId) ?? new Map();
    groupMap.set(m.id, m.coefficient);
    membersByGroup.set(m.groupId, groupMap);
  }

  // Get all expenses for these groups
  const allExpenses = await db
    .select()
    .from(schema.expenses)
    .where(and(inArray(schema.expenses.groupId, groupIds), isNull(schema.expenses.deletedAt)));

  // Get all participants
  const expenseIds = allExpenses.map((e) => e.id);
  const allParticipants =
    expenseIds.length > 0
      ? await db
          .select()
          .from(schema.expenseParticipants)
          .where(inArray(schema.expenseParticipants.expenseId, expenseIds))
      : [];

  const participantsByExpense = new Map<
    string,
    Array<{ memberId: string; customAmount: number | null }>
  >();
  for (const p of allParticipants) {
    const list = participantsByExpense.get(p.expenseId) ?? [];
    list.push({ memberId: p.memberId, customAmount: p.customAmount });
    participantsByExpense.set(p.expenseId, list);
  }

  // Get all settlements
  const allSettlements = await db
    .select()
    .from(schema.settlements)
    .where(inArray(schema.settlements.groupId, groupIds));

  // Calculate balance for each group
  const balanceByGroup = new Map<string, number>();
  for (const groupId of groupIds) {
    const myMemberId = memberIdByGroup.get(groupId);
    if (!myMemberId) continue;

    const memberCoeffs = membersByGroup.get(groupId) ?? new Map();
    const groupExpenses = allExpenses.filter((e) => e.groupId === groupId);
    const groupSettlements = allSettlements.filter((s) => s.groupId === groupId);

    // Process expenses
    const { totalPaid, totalOwed } = groupExpenses.reduce(
      (acc, expense) => {
        const participants = participantsByExpense.get(expense.id) ?? [];
        const shares = calculateShares(expense.amount, participants, memberCoeffs);
        return {
          totalPaid: acc.totalPaid + (expense.paidBy === myMemberId ? expense.amount : 0),
          totalOwed: acc.totalOwed + (shares.get(myMemberId) ?? 0),
        };
      },
      { totalPaid: 0, totalOwed: 0 },
    );

    // Process settlements
    const { settlementsPaid, settlementsReceived } = groupSettlements.reduce(
      (acc, settlement) => ({
        settlementsPaid:
          acc.settlementsPaid + (settlement.fromMember === myMemberId ? settlement.amount : 0),
        settlementsReceived:
          acc.settlementsReceived + (settlement.toMember === myMemberId ? settlement.amount : 0),
      }),
      { settlementsPaid: 0, settlementsReceived: 0 },
    );

    const netBalance = totalPaid - totalOwed + settlementsPaid - settlementsReceived;
    balanceByGroup.set(groupId, netBalance);
  }

  return userGroups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    incomeFrequency: group.incomeFrequency,
    memberCount: countMap.get(group.id) ?? 0,
    myBalance: balanceByGroup.get(group.id) ?? 0,
    isArchived: group.archivedAt !== null,
    createdAt: group.createdAt,
  }));
}

// GET /api/groups - List groups
groupsRoutes.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const groups = await listGroups(db, user.id);
  return c.json(groups);
});

// POST /api/groups - Create group
groupsRoutes.post('/', zValidator('json', createGroupSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const data = c.req.valid('json');

  const groupId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const now = new Date();
  const memberName = resolveInitialMemberName(user.name, user.email);

  // Use batch for atomic operations
  await db.batch([
    db.insert(schema.groups).values({
      id: groupId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      currency: data.currency,
      incomeFrequency: data.incomeFrequency,
      createdBy: user.id,
      createdAt: now,
    }),
    db.insert(schema.groupMembers).values({
      id: memberId,
      groupId,
      userId: user.id,
      name: memberName,
      email: user.email,
      income: 0,
      coefficient: 0,
      joinedAt: now,
    }),
  ]);

  return c.json({ id: groupId }, 201);
});

// Mount sub-router with membership middleware for /:id routes
const groupRouter = new Hono<AppEnv>();
groupRouter.use('*', membershipMiddleware);

// GET /api/groups/:id - Get group details
groupRouter.get('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;

  const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  const members = await db
    .select({
      id: schema.groupMembers.id,
      name: memberDisplayName,
      email: schema.groupMembers.email,
      userId: schema.groupMembers.userId,
      income: schema.groupMembers.income,
      coefficient: schema.groupMembers.coefficient,
      joinedAt: schema.groupMembers.joinedAt,
    })
    .from(schema.groupMembers)
    .leftJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
    .where(and(eq(schema.groupMembers.groupId, groupId), isNull(schema.groupMembers.leftAt)));

  const myMember = members.find((m) => m.userId === user.id);

  return c.json({
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    incomeFrequency: group.incomeFrequency,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    archivedAt: group.archivedAt,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      userId: m.userId,
      income: m.income,
      coefficient: m.coefficient,
      joinedAt: m.joinedAt,
    })),
    memberCount: members.length,
    myMemberId: myMember?.id,
  });
});

// PATCH /api/groups/:id - Update group
groupRouter.patch('/', zValidator('json', updateGroupSchema), async (c) => {
  const db = c.get('db');
  const groupId = c.req.param('id')!;
  const data = c.req.valid('json');

  const updates: {
    name?: string;
    description?: string | null;
    incomeFrequency?: 'annual' | 'monthly';
  } = {};
  if (data.name) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description?.trim() || null;
  if (data.incomeFrequency !== undefined) updates.incomeFrequency = data.incomeFrequency;

  if (Object.keys(updates).length > 0) {
    await db.update(schema.groups).set(updates).where(eq(schema.groups.id, groupId));
  }

  return c.json({ success: true });
});

// DELETE /api/groups/:id - Delete group
groupRouter.delete('/', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;

  const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  if (group.createdBy !== user.id) {
    return c.json({ error: API_ERROR_CODES.NOT_AUTHORIZED }, 403);
  }

  await db.delete(schema.groups).where(eq(schema.groups.id, groupId));

  return c.json({ success: true });
});

// POST /api/groups/:id/archive - Archive/unarchive group
groupRouter.post('/archive', async (c) => {
  const db = c.get('db');
  const groupId = c.req.param('id')!;

  const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, groupId));

  if (!group) {
    return c.json({ error: API_ERROR_CODES.GROUP_NOT_FOUND }, 404);
  }

  const newArchivedAt = group.archivedAt ? null : new Date();

  await db
    .update(schema.groups)
    .set({ archivedAt: newArchivedAt })
    .where(eq(schema.groups.id, groupId));

  return c.json({ success: true, isArchived: newArchivedAt !== null });
});

// POST /api/groups/:id/leave - Leave group
groupRouter.post('/leave', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const groupId = c.req.param('id')!;

  // Check if user is the only member
  const [memberCount] = await db
    .select({ count: count() })
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), isNull(schema.groupMembers.leftAt)));

  if ((memberCount?.count ?? 0) <= 1) {
    // Last member leaving: delete the group (cascades to all related data)
    await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
    return c.json({ success: true });
  }

  await db
    .update(schema.groupMembers)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, user.id),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  return c.json({ success: true });
});

// Mount sub-routers
groupRouter.route('/members', membersRoutes);
groupRouter.route('/expenses', expensesRoutes);
groupRouter.route('/balances', balancesRoutes);
groupRouter.route('/settlements', settlementsRoutes);
groupRouter.route('/invitations', invitationsRoutes);
groupRouter.route('/stats', statsRoutes);

// Mount the group router under /:id
groupsRoutes.route('/:id', groupRouter);
