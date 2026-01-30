PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`paid_by` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_expenses`("id", "group_id", "paid_by", "amount", "description", "date", "created_by", "created_at", "updated_at", "deleted_at") SELECT "id", "group_id", "paid_by", "amount", "description", "date", "created_by", "created_at", "updated_at", "deleted_at" FROM `expenses`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_group_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_group_invitations`("id", "group_id", "email", "token", "created_by", "expires_at", "accepted_at", "created_at") SELECT "id", "group_id", "email", "token", "created_by", "expires_at", "accepted_at", "created_at" FROM `group_invitations`;--> statement-breakpoint
DROP TABLE `group_invitations`;--> statement-breakpoint
ALTER TABLE `__new_group_invitations` RENAME TO `group_invitations`;--> statement-breakpoint
CREATE UNIQUE INDEX `group_invitations_token_unique` ON `group_invitations` (`token`);--> statement-breakpoint
CREATE TABLE `__new_group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text,
	`income` integer DEFAULT 0 NOT NULL,
	`coefficient` integer DEFAULT 0 NOT NULL,
	`joined_at` integer NOT NULL,
	`left_at` integer,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_group_members`("id", "group_id", "user_id", "name", "email", "income", "coefficient", "joined_at", "left_at") SELECT "id", "group_id", "user_id", "name", "email", "income", "coefficient", "joined_at", "left_at" FROM `group_members`;--> statement-breakpoint
DROP TABLE `group_members`;--> statement-breakpoint
ALTER TABLE `__new_group_members` RENAME TO `group_members`;--> statement-breakpoint
CREATE TABLE `__new_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_groups`("id", "name", "description", "currency", "created_by", "created_at", "archived_at") SELECT "id", "name", "description", "currency", "created_by", "created_at", "archived_at" FROM `groups`;--> statement-breakpoint
DROP TABLE `groups`;--> statement-breakpoint
ALTER TABLE `__new_groups` RENAME TO `groups`;--> statement-breakpoint
CREATE TABLE `__new_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`from_member` text NOT NULL,
	`to_member` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_member`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_member`) REFERENCES `group_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_settlements`("id", "group_id", "from_member", "to_member", "amount", "date", "created_at") SELECT "id", "group_id", "from_member", "to_member", "amount", "date", "created_at" FROM `settlements`;--> statement-breakpoint
DROP TABLE `settlements`;--> statement-breakpoint
ALTER TABLE `__new_settlements` RENAME TO `settlements`;