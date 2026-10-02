#!/bin/bash
# CRM-Umbau 01.10.2026 – Build, Datenbank-Sicherung, Migration, Deploy. Bricht bei jedem Fehler ab.
set -euo pipefail
cd "$(dirname "$0")"
CFG="--config wrangler.deploy.jsonc"
DB=ki-masterclass-crm-db
echo "== 1/6 Pakete installieren =="
npm install --no-audit --no-fund
echo "== 2/6 Build =="
npm run build
echo "== 3/6 Datenbank sichern =="
npx wrangler d1 export $DB --remote --output="d1-backup-$(date +%Y-%m-%d-%H%M).sql" $CFG
echo "== 4/6 Prüfen, ob Migration schon drin ist =="
if npx wrangler d1 execute $DB --remote --json --command "PRAGMA table_info(companies)" $CFG | grep -q '"origin_city"'; then
  echo "Spalte origin_city existiert bereits – Migration wird übersprungen."
else
  echo "== 5/6 Migration einspielen =="
  npx wrangler d1 execute $DB --remote --file=drizzle/0006_crm_umbau.sql $CFG
fi
npx wrangler d1 execute $DB --remote --command "SELECT stage, COUNT(*) AS anzahl FROM companies GROUP BY stage" $CFG
echo "== 6/6 Deploy =="
npx wrangler deploy $CFG
echo
echo "FERTIG. Bitte https://crm.ki-masterclass.com öffnen und neu anmelden."
