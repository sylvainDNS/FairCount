ALTER TABLE `groups` ADD `income_frequency` text DEFAULT 'annual' NOT NULL;--> statement-breakpoint
-- Existing groups had income entered as monthly amounts, so retroactively set them to 'monthly'.
-- New groups will default to 'annual' per schema definition.
UPDATE `groups` SET `income_frequency` = 'monthly';