import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { groups } from './groups';
import { groupMembers } from './members';

// Recurrence ("récurrence"): template of an expense + unit frequency rule.
// Each échéance (due date) generates an ordinary row in `expenses`.
// Note: Date columns use integer timestamps in milliseconds for better-auth compatibility
export const recurringExpenses = sqliteTable(
  'recurring_expenses',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    paidBy: text('paid_by')
      .notNull()
      .references(() => groupMembers.id),
    amount: integer('amount').notNull(), // cents, > 0
    description: text('description').notNull(),
    frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
    dayOfWeek: integer('day_of_week'), // 1-7 (ISO, Monday = 1); set iff weekly
    dayOfMonth: integer('day_of_month'), // 1-31; set iff monthly or yearly
    month: integer('month'), // 1-12; set iff yearly (from start date)
    startDate: text('start_date').notNull(), // YYYY-MM-DD, immutable
    nextDueDate: text('next_due_date').notNull(), // YYYY-MM-DD, next échéance to materialise
    disabledAt: integer('disabled_at', { mode: 'timestamp_ms' }), // manual deactivation
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }), // soft delete
    createdBy: text('created_by')
      .notNull()
      .references(() => groupMembers.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_recurring_expenses_group').on(table.groupId),
    index('idx_recurring_expenses_due').on(table.nextDueDate),
  ],
);

export const recurringExpenseParticipants = sqliteTable('recurring_expense_participants', {
  id: text('id').primaryKey(),
  recurringExpenseId: text('recurring_expense_id')
    .notNull()
    .references(() => recurringExpenses.id, { onDelete: 'cascade' }),
  memberId: text('member_id')
    .notNull()
    .references(() => groupMembers.id),
  customAmount: integer('custom_amount'), // null = fair share, otherwise cents
});

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type NewRecurringExpense = typeof recurringExpenses.$inferInsert;
export type RecurringExpenseParticipant = typeof recurringExpenseParticipants.$inferSelect;
export type NewRecurringExpenseParticipant = typeof recurringExpenseParticipants.$inferInsert;
