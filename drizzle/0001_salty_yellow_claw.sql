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
