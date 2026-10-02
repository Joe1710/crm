# CRM-Umbau 01.10.2026 – Übergabe an Claude Code (Mac)

Dieser Ordner ist die **Live-Quelle** von crm.ki-masterclass.com (Worker `ki-masterclass-crm`, D1 `ki-masterclass-crm-db`).
Der Code ist fertig umgebaut. Es fehlen nur: Build prüfen, Datenbank-Migration, Deploy.
Die geänderten Originaldateien liegen in `_backup_vor_umbau_2026-10-01/`.

## Bitte in dieser Reihenfolge ausführen

1. `cd` in diesen Ordner. Falls `node_modules` fehlt oder unvollständig ist (iCloud!): `npm install`.
2. Build/Typen prüfen: `npx tsc --noEmit` und `npm run build`. Fehler beheben, ohne die Funktionen unten zu ändern.
3. **Datenbank sichern:**
   `npx wrangler d1 export ki-masterclass-crm-db --remote --output=d1-backup-2026-10-01.sql --config wrangler.deploy.jsonc`
4. Prüfen, dass die neuen Spalten noch nicht existieren:
   `npx wrangler d1 execute ki-masterclass-crm-db --remote --command "PRAGMA table_info(companies)" --config wrangler.deploy.jsonc`
   (es darf noch KEIN `origin_city`, `stage_changed_at`, `last_activity_at`, `last_result` geben)
5. **Migration einspielen:**
   `npx wrangler d1 execute ki-masterclass-crm-db --remote --file=drizzle/0006_crm_umbau.sql --config wrangler.deploy.jsonc`
   Danach kontrollieren: `SELECT stage, COUNT(*) FROM companies GROUP BY stage` → nur noch Neu / 1. Kontakt / 2. Kontakt / 3. Kontakt / Zugesagt / Verloren.
6. Deployen: `npm run deploy`. Danach prüfen, dass https://crm.ki-masterclass.com weiter erreichbar ist (Custom Domain ist im Cloudflare-Dashboard hinterlegt).
7. Sichttest (Jürgen meldet sich selbst an): Übersicht mit Städteauswahl, Unternehmen öffnen, „Vorschau“ der E-Mails 1–3, Aktivität eintragen, Aufgaben-Seite, Terminmanagement-Monatskacheln, „Mit Notion synchronisieren“ (die Meldung nennt jetzt den genauen Fehler).
   Für einen Versandtest vorher Secret `OUTREACH_TEST_MODE=true` und `OUTREACH_TEST_RECIPIENTS=jk@ki-masterclass.com` setzen und danach wieder entfernen.
8. Diesen Stand sichern: im Ordner ein frisches Git-Repo anlegen bzw. das defekte `.git` reparieren und committen (das bestehende `.git` ist durch iCloud beschädigt).

## Was geändert wurde (fachlich)

- **Funnel-Stufen neu:** Neu → 1. Kontakt → 2. Kontakt → 3. Kontakt → Zugesagt | Verloren. Von jeder Stufe direkt auf Zugesagt/Verloren möglich. Alte Stufen werden per Migration umgeschlüsselt (`lib/crm-stages.ts`).
- **Drei feste E-Mails** (Wortlaut von Jürgen) im HTML-Layout, Link https://ki-masterclass.com/ki-speed-date/ (`lib/outreach-html.ts`). Senden schiebt die Firma automatisch in die passende Kontaktstufe. Keine frei formulierten Briefe mehr; „Profil & Stil“ entfällt (`/settings` leitet auf `/` um).
- **Städteauswahl** (56 Städte) wieder da: Sidebar + Übersicht; Feld `companies.origin_city`, auch in der Tiefensuche (`lib/german-cities.ts`).
- **Übersicht** größer, Liste „Aktuelle Unternehmen“ entfernt. **Unternehmensliste** größer, Spalte „Nächster Schritt“ entfernt.
- **Firmen-Detail** breit: Kontakt, Anrede, Status-Chips, Notizen (bearbeitbar), E-Mails 1–3 mit Vorschau/Senden, Aktivität eintragen (Anruf/Gespräch/E-Mail/Notiz + Ergebnis positiv/unsicher/sonstiges), Historie. Neue Tabelle `activities`, API `app/api/companies/[id]/activities`.
- **Aufgaben:** aktive Firma > 14 Tage ohne Bewegung → Aufgabe; Ergebnis „positiv“ = Priorität A, immer oben. Aktionen direkt in der Zeile, alles wird protokolliert.
- **Terminmanagement:** Monatskacheln, Klick öffnet Monatsliste (Webinare, Workshops, Veranstaltungen, Wiedervorlagen).
- **Automatischer Nachversand per Cron ist AUS** (nur mit Secret `OUTREACH_AUTO_SEND=true`), weil fällige Kontakte jetzt bewusst über „Aufgaben“ laufen.
- **Notion-Sync repariert:** Änderungen durch E-Mail-Versand/Antworten wurden bisher nie als „geändert“ markiert und kamen nicht in Notion an. Felder, die Notion ablehnt, werden jetzt einzeln übersprungen statt den Datensatz scheitern zu lassen; die Fehlermeldung wird im CRM angezeigt. Nach der Migration werden alle Firmen einmal neu übertragen (bis 40 pro Klick).
- Hinweis: Die Inbox-Antwortfunktion (`lib/inbox-reply.ts`) liest weiterhin `users.bio` aus der Datenbank. Der gespeicherte Text bleibt erhalten; nur die Bearbeitungsseite `/settings` ist ausgeblendet. Bei Bedarf wieder einblenden: `_backup_vor_umbau_2026-10-01/app/settings/page.tsx`.
