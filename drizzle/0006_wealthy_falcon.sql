ALTER TABLE `companies` ADD `highlight` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `highlight_source_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `highlight_generated_at` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `email1_subject` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `email1_body` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `email1_generated_at` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `email2_subject` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `email2_body` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `email2_generated_at` text;