import { and, eq, isNull, lt, type SQL, sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import * as schema from '@/db/schema';

/**
 * SQL expression that resolves a member's display name:
 * 1. users.name (from profile, if non-empty)
 * 2. group_members.name (set at join time, if non-empty)
 * 3. group_members.email (always set for linked members)
 * 4. '?' (safety net — should never be reached)
 *
 * NULLIF converts empty strings to NULL so COALESCE skips them.
 * Requires a LEFT JOIN on schema.users via groupMembers.userId.
 */
export const memberDisplayName = sql<string>`coalesce(nullif(${schema.users.name}, ''), nullif(${schema.groupMembers.name}, ''), ${schema.groupMembers.email}, '?')`;

/**
 * Resolve a member's initial display name at write time (insert into group_members).
 * Uses the user's profile name, falling back to the local part of the email.
 */
export function resolveInitialMemberName(name: string | null | undefined, email: string): string {
  return name?.trim() || email.split('@')[0] || email;
}

/**
 * Build SQL IN clause for a list of IDs.
 * Returns undefined if the list is empty (caller should handle this case).
 *
 * @example
 * const condition = sqlInClause(schema.expenses.id, expenseIds);
 * if (condition) {
 *   query.where(condition);
 * }
 */
export function sqlInClause(column: SQLiteColumn, ids: readonly string[]): SQL | undefined {
  if (ids.length === 0) return undefined;

  return sql`${column} IN (${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )})`;
}

/**
 * Build cursor-based pagination condition.
 * Returns undefined if cursor is invalid or not provided.
 *
 * @example
 * const cursorCondition = buildCursorCondition(schema.expenses.createdAt, params.cursor);
 * if (cursorCondition) {
 *   conditions.push(cursorCondition);
 * }
 */
export function buildCursorCondition(
  column: SQLiteColumn,
  cursor: string | undefined,
): SQL | undefined {
  if (!cursor) return undefined;

  const cursorDate = new Date(cursor);
  if (Number.isNaN(cursorDate.getTime())) return undefined;

  return lt(column, cursorDate);
}

/**
 * Build condition for active (non-left) members of a group.
 *
 * @example
 * const members = await db
 *   .select()
 *   .from(schema.groupMembers)
 *   .where(activeGroupMembersCondition(groupId));
 */
export function activeGroupMembersCondition(groupId: string): SQL {
  return and(eq(schema.groupMembers.groupId, groupId), isNull(schema.groupMembers.leftAt)) as SQL;
}
