CREATE TABLE `recurring_expense_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`recurring_expense_id` text NOT NULL,
	`member_id` text NOT NULL,
	`custom_amount` integer,
	FOREIGN KEY (`recurring_expense_id`) REFERENCES `recurring_expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`paid_by` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text NOT NULL,
	`frequency` text NOT NULL,
	`day_of_week` integer,
	`day_of_month` integer,
	`month` integer,
	`start_date` text NOT NULL,
	`next_due_date` text NOT NULL,
	`disabled_at` integer,
	`deleted_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_expenses_group` ON `recurring_expenses` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_recurring_expenses_due` ON `recurring_expenses` (`next_due_date`);--> statement-breakpoint
ALTER TABLE `expenses` ADD `recurring_expense_id` text REFERENCES recurring_expenses(id);--> statement-breakpoint
ALTER TABLE `expenses` ADD `recurrence_due_date` text;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_expenses_recurrence_due` ON `expenses` (`recurring_expense_id`,`recurrence_due_date`) WHERE "expenses"."recurring_expense_id" IS NOT NULL;