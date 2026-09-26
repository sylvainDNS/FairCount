import { and, eq } from 'drizzle-orm';
import type { Database } from '@/db';
import * as schema from '@/db/schema';

const DEFAULT_JOINT_ACCOUNT_NAME = 'Compte commun';

export interface JointAccountView {
  readonly memberId: string;
  readonly name: string;
  readonly active: boolean;
}

/**
 * Fetch a group's joint account row (whether active or disabled), or null if it
 * was never created. The joint account is a virtual group_members row with
 * kind = 'joint_account'.
 */
export async function getJointAccount(
  db: Database,
  groupId: string,
): Promise<JointAccountView | null> {
  const [row] = await db
    .select({
      id: schema.groupMembers.id,
      name: schema.groupMembers.name,
      leftAt: schema.groupMembers.leftAt,
    })
    .from(schema.groupMembers)
    .where(
      and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.kind, 'joint_account')),
    );

  if (!row) return null;

  return { memberId: row.id, name: row.name, active: row.leftAt === null };
}

/**
 * Create, rename or reactivate a group's joint account (idempotent upsert).
 * - Absent: insert an active joint account row.
 * - Existing (active or disabled): clear leftAt (reactivate) and update the name
 *   when a new one is provided.
 * The unique partial index guarantees at most one joint account per group.
 */
export async function upsertJointAccount(
  db: Database,
  groupId: string,
  name?: string,
): Promise<JointAccountView> {
  let existing = await getJointAccount(db, groupId);

  if (!existing) {
    const memberId = crypto.randomUUID();
    const resolvedName = name?.trim() || DEFAULT_JOINT_ACCOUNT_NAME;
    // A concurrent PUT may insert first: the unique partial index then rejects
    // this row, and we fall through to the update path on the winner's row.
    const inserted = await db
      .insert(schema.groupMembers)
      .values({
        id: memberId,
        groupId,
        userId: null,
        kind: 'joint_account',
        name: resolvedName,
        email: null,
        income: 0,
        coefficient: 0,
        joinedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: schema.groupMembers.id });
    if (inserted.length > 0) {
      return { memberId, name: resolvedName, active: true };
    }
    existing = await getJointAccount(db, groupId);
    if (!existing) {
      throw new Error(`Joint account insert conflicted but no row found for group ${groupId}`);
    }
  }

  const updates: { leftAt: null; name?: string } = { leftAt: null };
  if (name !== undefined) updates.name = name.trim();

  await db
    .update(schema.groupMembers)
    .set(updates)
    .where(eq(schema.groupMembers.id, existing.memberId));

  return {
    memberId: existing.memberId,
    name: updates.name ?? existing.name,
    active: true,
  };
}

/**
 * Disable a group's joint account by setting leftAt. Idempotent.
 * Returns false when the group has no joint account (never created).
 * History and balances are preserved: existing expenses keep referencing the
 * (now disabled) member by id.
 */
export async function disableJointAccount(db: Database, groupId: string): Promise<boolean> {
  const existing = await getJointAccount(db, groupId);
  if (!existing) return false;

  if (existing.active) {
    await db
      .update(schema.groupMembers)
      .set({ leftAt: new Date() })
      .where(eq(schema.groupMembers.id, existing.memberId));
  }

  return true;
}
