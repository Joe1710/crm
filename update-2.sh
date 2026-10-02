#!/bin/bash
# Update 2 (01.10.2026): Zusage-E-Mail, Anmeldungen speichern, Notion in Paketen, neue Überschriften, Tiefensuche nur mit E-Mail.
set -euo pipefail
cd "$(dirname "$0")"
CFG="--config wrangler.deploy.jsonc"
DB=ki-masterclass-crm-db
run() { npx wrangler d1 execute $DB --remote --yes $CFG --command "$1"; }
has_col() { npx wrangler d1 execute $DB --remote --json $CFG --command "PRAGMA table_info($1)" | grep -q "\"$2\""; }

echo "== 1/3 Build =="
npm run build
echo "== 2/3 Datenbank ergänzen =="
run "CREATE TABLE IF NOT EXISTS event_signups (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, name text NOT NULL, company text DEFAULT '' NOT NULL, email text NOT NULL, persons integer DEFAULT 1 NOT NULL, message text DEFAULT '' NOT NULL, consent text DEFAULT '' NOT NULL, company_id integer, mail_status text DEFAULT '' NOT NULL, created_at text NOT NULL)"
has_col companies registered_at || run "ALTER TABLE companies ADD registered_at text"
run "UPDATE companies SET notion_sync_error = NULL WHERE notion_sync_error LIKE '%subrequests%'"
echo "== 3/3 Deploy =="
npx wrangler deploy $CFG
echo
echo "FERTIG – bitte CRM neu laden."
