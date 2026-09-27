CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`industry` text DEFAULT 'Sonstige' NOT NULL,
	`employees` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`manager` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'Neu gefunden' NOT NULL,
	`priority` text DEFAULT 'B' NOT NULL,
	`owner` text DEFAULT 'Ivan' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`next_date` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'Manuell' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`notion_page_id` text,
	`notion_synced_at` text,
	`notion_sync_error` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE `research_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`industry` text NOT NULL,
	`radius` integer NOT NULL,
	`employees` text NOT NULL,
	`legal_form` text DEFAULT 'Alle Rechtsformen' NOT NULL,
	`region` text DEFAULT 'Nürnberg, Fürth und Erlangen' NOT NULL,
	`result_limit` integer DEFAULT 10 NOT NULL,
	`status` text DEFAULT 'Datenquelle ausstehend' NOT NULL,
	`provider` text DEFAULT 'Nicht verbunden' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `style_samples` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`bio` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);