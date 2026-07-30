CREATE TABLE `notion_sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL,
	`processed` integer DEFAULT 0 NOT NULL,
	`succeeded` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `notion_page_id` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `notion_synced_at` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `notion_sync_error` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;