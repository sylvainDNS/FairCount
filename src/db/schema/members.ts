import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { groups } from './groups';
import { users } from './users';

export const groupMembers = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id), // null si personne non inscrite
  name: text('name').notNull(),
  email: text('email'),
  income: integer('income').notNull().default(0), // revenu mensuel en centimes
  coefficient: integer('coefficient').notNull().default(0), // coefficient * 10000 pour precision
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
  leftAt: integer('left_at', { mode: 'timestamp' }),
});

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
