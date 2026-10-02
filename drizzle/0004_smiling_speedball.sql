CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text DEFAULT '' NOT NULL,
	`capacity` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Planung' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`notion_page_id` text,
	`notion_synced_at` text,
	`notion_sync_error` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
