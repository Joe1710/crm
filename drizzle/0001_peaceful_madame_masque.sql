CREATE TABLE `inbox_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_address` text NOT NULL,
	`from_name` text DEFAULT '' NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`received_at` text NOT NULL,
	`body_text` text DEFAULT '' NOT NULL,
	`attachments_drive_url` text,
	`text_pdf_drive_url` text,
	`reply_draft` text,
	`reply_final` text,
	`status` text DEFAULT 'Neu' NOT NULL,
	`sent_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outreach_emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`step_number` integer NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`sent_to` text NOT NULL,
	`triggered_by` text DEFAULT 'manual' NOT NULL,
	`sent_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `outreach_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `last_outreach_at` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `awaiting_reply` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `outreach_reminder_1` text;--> statement-breakpoint
ALTER TABLE `users` ADD `outreach_reminder_2` text;--> statement-breakpoint
ALTER TABLE `users` ADD `outreach_confirmation` text;