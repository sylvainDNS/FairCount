import { and, count, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../../db';
import * as schema from '../../../db/schema';

interface MemberContext {
  readonly db: Database;
  readonly groupId: string;
  readonly userId: string;
}

// Recalculate all coefficients for a group
export async function recalculateCoefficients(db: Database, groupId: string): Promise<void> {
  // Get all active members with their incomes
  const members = await db
    .select({ id: schema.groupMembers.id, income: schema.groupMembers.income })
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), isNull(schema.groupMembers.leftAt)));

  if (members.length === 0) return;

  const totalIncome = members.reduce((sum, m) => sum + m.income, 0);

  // Calculate coefficients
  const updates = members.map((member) => {
    let coefficient: number;
    if (totalIncome === 0) {
      // Equal split when no income declared
      coefficient = Math.round(10000 / members.length);
    } else {
      coefficient = Math.round((member.income * 10000) / totalIncome);
    }

    return db
      .update(schema.groupMembers)
      .set({ coefficient })
      .where(eq(schema.groupMembers.id, member.id));
  });

  // Use batch for atomic update
  await db.batch(updates as [(typeof updates)[0], ...typeof updates]);
}

// List all members
export async function listMembers(ctx: MemberContext): Promise<Response> {
  const members = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, ctx.groupId), isNull(schema.groupMembers.leftAt)))
    .orderBy(schema.groupMembers.joinedAt);

  const totalCoefficient = members.reduce((sum, m) => sum + m.coefficient, 0);

  return Response.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      userId: m.userId,
      income: m.income,
      coefficient: m.coefficient,
      coefficientPercent:
        totalCoefficient > 0
          ? Math.round((m.coefficient / totalCoefficient) * 100)
          : Math.round(100 / members.length),
      joinedAt: m.joinedAt,
      isCurrentUser: m.userId === ctx.userId,
    })),
  );
}

// Get member details
export async function getMember(ctx: MemberContext, memberId: string): Promise<Response> {
  const [member] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, memberId),
        eq(schema.groupMembers.groupId, ctx.groupId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!member) {
    return Response.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
  }

  return Response.json({
    id: member.id,
    name: member.name,
    email: member.email,
    userId: member.userId,
    income: member.income,
    coefficient: member.coefficient,
    joinedAt: member.joinedAt,
    isCurrentUser: member.userId === ctx.userId,
  });
}

// Update member
export async function updateMember(
  ctx: MemberContext,
  memberId: string,
  data: { name?: string | undefined; income?: number | undefined },
): Promise<Response> {
  // Verify member exists
  const [member] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, memberId),
        eq(schema.groupMembers.groupId, ctx.groupId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!member) {
    return Response.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
  }

  const updates: { name?: string; income?: number } = {};

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) {
      return Response.json({ error: 'INVALID_NAME' }, { status: 400 });
    }
    updates.name = name;
  }

  if (data.income !== undefined) {
    if (typeof data.income !== 'number' || data.income < 0) {
      return Response.json({ error: 'INVALID_INCOME' }, { status: 400 });
    }
    updates.income = Math.round(data.income); // Ensure integer
  }

  if (Object.keys(updates).length > 0) {
    await ctx.db
      .update(schema.groupMembers)
      .set(updates)
      .where(eq(schema.groupMembers.id, memberId));

    // Recalculate coefficients if income changed
    if (data.income !== undefined) {
      await recalculateCoefficients(ctx.db, ctx.groupId);
    }
  }

  return Response.json({ success: true });
}

// Remove member (soft delete)
export async function removeMember(ctx: MemberContext, memberId: string): Promise<Response> {
  const [member] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.id, memberId),
        eq(schema.groupMembers.groupId, ctx.groupId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!member) {
    return Response.json({ error: 'MEMBER_NOT_FOUND' }, { status: 404 });
  }

  // Cannot remove self via this endpoint (use leave group instead)
  if (member.userId === ctx.userId) {
    return Response.json({ error: 'CANNOT_REMOVE_SELF' }, { status: 400 });
  }

  // Check if this would leave the group empty
  const [memberCount] = await ctx.db
    .select({ count: count() })
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, ctx.groupId), isNull(schema.groupMembers.leftAt)));

  if ((memberCount?.count ?? 0) <= 1) {
    return Response.json({ error: 'CANNOT_REMOVE_LAST_MEMBER' }, { status: 400 });
  }

  // Soft delete
  await ctx.db
    .update(schema.groupMembers)
    .set({ leftAt: new Date() })
    .where(eq(schema.groupMembers.id, memberId));

  // Recalculate coefficients
  await recalculateCoefficients(ctx.db, ctx.groupId);

  return Response.json({ success: true });
}

// Update own membership (special /me endpoint)
export async function updateMyMembership(
  ctx: MemberContext,
  data: { name?: string | undefined; income?: number | undefined },
): Promise<Response> {
  // Find current user's membership
  const [myMember] = await ctx.db
    .select()
    .from(schema.groupMembers)
    .where(
      and(
        eq(schema.groupMembers.groupId, ctx.groupId),
        eq(schema.groupMembers.userId, ctx.userId),
        isNull(schema.groupMembers.leftAt),
      ),
    );

  if (!myMember) {
    return Response.json({ error: 'NOT_A_MEMBER' }, { status: 403 });
  }

  // Delegate to updateMember
  return updateMember(ctx, myMember.id, data);
}
