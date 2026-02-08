import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

// Note: Date columns use integer timestamps in milliseconds for better-auth compatibility
export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  currency: text('currency').notNull().default('EUR'),
  incomeFrequency: text('income_frequency').notNull().default('annual'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
});

export const groupInvitations = sqliteTable('group_invitations', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
  declinedAt: integer('declined_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupInvitation = typeof groupInvitations.$inferSelect;
export type NewGroupInvitation = typeof groupInvitations.$inferInsert;
