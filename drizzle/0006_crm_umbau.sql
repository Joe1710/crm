CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`kind` text DEFAULT 'Notiz' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `companies` ADD `origin_city` text DEFAULT 'Nürnberg' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `stage_changed_at` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `last_activity_at` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `last_result` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `research_jobs` ADD `origin_city` text DEFAULT 'Nürnberg' NOT NULL;--> statement-breakpoint
-- Datenmigration: alte Funnel-Stufen auf die neuen sechs Stufen abbilden
UPDATE `companies` SET `stage` = CASE
	WHEN `stage` IN ('Veranstaltung zugesagt', 'Teilgenommen', 'Angebot erstellt', 'Auftrag abgeschlossen') THEN 'Zugesagt'
	WHEN `outreach_step` >= 3 THEN '3. Kontakt'
	WHEN `outreach_step` = 2 THEN '2. Kontakt'
	WHEN `outreach_step` = 1 THEN '1. Kontakt'
	WHEN `stage` IN ('Kontakt aufgenommen', 'Gespräch geführt', 'Interesse', 'Unterlagen versendet') THEN '1. Kontakt'
	ELSE 'Neu'
END
WHERE `stage` NOT IN ('Neu', '1. Kontakt', '2. Kontakt', '3. Kontakt', 'Zugesagt', 'Verloren');--> statement-breakpoint
UPDATE `companies` SET `stage_changed_at` = COALESCE(`last_outreach_at`, CASE WHEN `updated_at` LIKE '20%' THEN `updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END) WHERE `stage_changed_at` IS NULL;--> statement-breakpoint
UPDATE `companies` SET `notion_synced_at` = NULL;
