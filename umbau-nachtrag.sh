#!/bin/bash
# Nachtrag: spielt nur die Teile der Migration ein, die in der Datenbank noch fehlen.
set -euo pipefail
cd "$(dirname "$0")"
CFG="--config wrangler.deploy.jsonc"
DB=ki-masterclass-crm-db
run() { npx wrangler d1 execute $DB --remote --yes $CFG --command "$1"; }
has_col() { npx wrangler d1 execute $DB --remote --json $CFG --command "PRAGMA table_info($1)" | grep -q "\"$2\""; }

echo "== Spalten prüfen und ergänzen =="
has_col companies origin_city      || run "ALTER TABLE companies ADD origin_city text DEFAULT 'Nürnberg' NOT NULL"
has_col companies stage_changed_at || run "ALTER TABLE companies ADD stage_changed_at text"
has_col companies last_activity_at || run "ALTER TABLE companies ADD last_activity_at text"
has_col companies last_result      || run "ALTER TABLE companies ADD last_result text DEFAULT '' NOT NULL"
has_col research_jobs origin_city  || run "ALTER TABLE research_jobs ADD origin_city text DEFAULT 'Nürnberg' NOT NULL"

echo "== Tabelle activities =="
run "CREATE TABLE IF NOT EXISTS activities (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, company_id integer NOT NULL, kind text DEFAULT 'Notiz' NOT NULL, result text DEFAULT '' NOT NULL, note text DEFAULT '' NOT NULL, created_by text DEFAULT '' NOT NULL, created_at text NOT NULL, FOREIGN KEY (company_id) REFERENCES companies(id))"

echo "== Stufen umstellen =="
run "UPDATE companies SET stage = CASE WHEN stage IN ('Veranstaltung zugesagt','Teilgenommen','Angebot erstellt','Auftrag abgeschlossen') THEN 'Zugesagt' WHEN outreach_step >= 3 THEN '3. Kontakt' WHEN outreach_step = 2 THEN '2. Kontakt' WHEN outreach_step = 1 THEN '1. Kontakt' WHEN stage IN ('Kontakt aufgenommen','Gespräch geführt','Interesse','Unterlagen versendet') THEN '1. Kontakt' ELSE 'Neu' END WHERE stage NOT IN ('Neu','1. Kontakt','2. Kontakt','3. Kontakt','Zugesagt','Verloren')"
run "UPDATE companies SET stage_changed_at = COALESCE(last_outreach_at, CASE WHEN updated_at LIKE '20%' THEN updated_at ELSE strftime('%Y-%m-%dT%H:%M:%fZ','now') END) WHERE stage_changed_at IS NULL"
run "UPDATE companies SET notion_synced_at = NULL"

echo "== Kontrolle =="
run "SELECT stage, COUNT(*) AS anzahl FROM companies GROUP BY stage"
run "SELECT COUNT(*) AS aktivitaeten FROM activities"
echo "FERTIG – bitte CRM neu laden."
