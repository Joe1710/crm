CREATE TABLE IF NOT EXISTS `event_signups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`persons` integer DEFAULT 1 NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`consent` text DEFAULT '' NOT NULL,
	`company_id` integer,
	`mail_status` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `registered_at` text;
