import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { groups } from './groups';
import { users } from './users';

// Note: Date columns use integer timestamps in milliseconds for better-auth compatibility
export const groupMembers = sqliteTable(
  'group_members',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id), // null si personne non inscrite
    // 'person': real member; 'joint_account': virtual payer (shared household account)
    kind: text('kind', { enum: ['person', 'joint_account'] })
      .notNull()
      .default('person'),
    name: text('name').notNull(),
    email: text('email'),
    income: integer('income').notNull().default(0), // revenu en centimes (mensuel ou annuel selon le groupe)
    coefficient: integer('coefficient').notNull().default(0), // coefficient * 10000 pour precision
    joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull(),
    leftAt: integer('left_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    // At most one joint account per group (active or not)
    uniqueIndex('uq_group_members_joint_account')
      .on(table.groupId)
      .where(sql`${table.kind} = 'joint_account'`),
  ],
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
