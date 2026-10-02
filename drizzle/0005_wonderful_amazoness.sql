CREATE TABLE `masterclass_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cohort` text NOT NULL,
	`date` text NOT NULL,
	`day_of_week` text DEFAULT '' NOT NULL,
	`start_time` text DEFAULT '' NOT NULL,
	`end_time` text DEFAULT '' NOT NULL,
	`group` text DEFAULT 'Alle' NOT NULL,
	`session_type` text DEFAULT 'Webinar' NOT NULL,
	`module_number` integer DEFAULT 0 NOT NULL,
	`term` text DEFAULT '' NOT NULL,
	`chapter_number` integer,
	`topic` text DEFAULT '' NOT NULL,
	`channel` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
