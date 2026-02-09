import { and, eq, isNull, lt, type SQL, sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import * as schema from '@/db/schema';

/**
 * SQL expression that resolves a member's display name:
 * - Linked members (userId != null): uses users.name
 * - Pending members (userId == null): falls back to group_members.name
 *
 * Requires a LEFT JOIN on schema.users via groupMembers.userId.
 *
 * Typed as `string` (non-null) because group_members.name is NOT NULL,
 * so COALESCE always returns a value even when users.name is null.
 */
export const memberDisplayName = sql<string>`coalesce(${schema.users.name}, ${schema.groupMembers.name})`;

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
