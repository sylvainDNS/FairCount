import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { groups } from './groups';
import { groupMembers } from './members';

export const settlements = sqliteTable('settlements', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  fromMember: text('from_member')
    .notNull()
    .references(() => groupMembers.id),
  toMember: text('to_member')
    .notNull()
    .references(() => groupMembers.id),
  amount: integer('amount').notNull(), // montant en centimes (toujours positif)
  date: text('date').notNull(), // ISO date string (YYYY-MM-DD) - date metier choisie par l'utilisateur
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
