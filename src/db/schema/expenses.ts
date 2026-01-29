import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { groups } from './groups';
import { groupMembers } from './members';

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  paidBy: text('paid_by')
    .notNull()
    .references(() => groupMembers.id),
  amount: integer('amount').notNull(), // montant en centimes (toujours positif)
  description: text('description').notNull(),
  date: text('date').notNull(), // ISO date string
  createdBy: text('created_by')
    .notNull()
    .references(() => groupMembers.id),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
  deletedAt: text('deleted_at'), // soft delete
});

export const expenseParticipants = sqliteTable('expense_participants', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),
  memberId: text('member_id')
    .notNull()
    .references(() => groupMembers.id),
  customAmount: integer('custom_amount'), // null = calcul équitable, sinon montant en centimes
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseParticipant = typeof expenseParticipants.$inferSelect;
export type NewExpenseParticipant = typeof expenseParticipants.$inferInsert;
