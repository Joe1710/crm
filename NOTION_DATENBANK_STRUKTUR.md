# Notion-Struktur für das KI-Masterclass-CRM

## Empfehlung

Die Cloud-Datenbank des CRM bleibt die führende Datenquelle. Notion wird als synchronisierte Arbeits-, Kontroll- und Berichtsebene angebunden. So bleiben Suche, Dublettenprüfung und Automatisierung belastbar, während Jürgen und Ivan die vertraute Notion-Oberfläche nutzen können.

## 1. Datenbank „Unternehmen“

| Eigenschaft | Notion-Typ | Vorgabe |
|---|---|---|
| Unternehmen | Titel | Pflichtfeld, eindeutiger Firmenname |
| CRM-ID | Zahl | Unveränderliche ID aus dem CRM |
| Status | Auswahl | Neu gefunden; Qualifiziert; Kontakt vorgesehen; Kontakt aufgenommen; Gespräch geführt; Interesse; Unterlagen versendet; Veranstaltung zugesagt; Teilgenommen; Angebot erstellt; Auftrag abgeschlossen |
| Priorität | Auswahl | A; B; C |
| Verantwortlich | Person oder Auswahl | Ivan; Jürgen |
| Branche | Auswahl | Einheitliche Branchenliste |
| Mitarbeiterklasse | Auswahl | 10–19; 20–49; 50–99; 100–249 |
| Rechtsform | Auswahl | GmbH; GmbH & Co. KG; KG; AG; e.K.; Sonstige |
| Ort | Text | Pflichtfeld |
| Anschrift | Text | Straße, Hausnummer, PLZ, Ort |
| Entfernung Nürnberg | Zahl | Kilometer |
| Geschäftsführung | Text | Name der handelnden Person |
| Telefon | Telefon | Zentrale oder direkter Kontakt |
| E-Mail | E-Mail | Geschäftliche Adresse |
| Website | URL | Unternehmenswebsite |
| Quelle | URL oder Text | Nachprüfbare Fundstelle |
| Quelldatum | Datum | Letzte Überprüfung |
| Nächster Schritt | Text | Konkrete nächste Handlung |
| Wiedervorlage | Datum | Fälligkeit mit Uhrzeit, falls nötig |
| Notizen | Text | Nur geschäftlich erforderliche Angaben |
| Rechercheauftrag | Relation | Verknüpfung zu „Rechercheaufträge“ |
| Aktivitäten | Relation | Verknüpfung zu „Aktivitäten“ |
| Veranstaltungen | Relation | Verknüpfung zu „Veranstaltungen“ |
| Dubletten-Schlüssel | Formel | Normalisierter Firmenname plus PLZ oder Domain |
| Letzte Synchronisierung | Datum | Automatisch gesetzt |

## 2. Datenbank „Rechercheaufträge“

| Eigenschaft | Notion-Typ | Vorgabe |
|---|---|---|
| Recherche | Titel | Zum Beispiel „Maschinenbau · 30 km · 30.07.2026“ |
| CRM-Auftrags-ID | Zahl | Eindeutige ID |
| Branche | Auswahl oder Text | Suchkriterium |
| Radius | Zahl | 10 bis 100 km |
| Mitarbeiterklasse | Auswahl | Gewünschte Größenordnung |
| Rechtsform | Mehrfachauswahl | Gewünschte Firmierung |
| Region | Text | Regionaler Schwerpunkt |
| Soll-Ergebnisse | Zahl | Standardwert 10 |
| Status | Status | Entwurf; Läuft; Prüfung; Abgeschlossen; Fehler |
| Datenquelle | Auswahl | Der später angeschlossene Anbieter |
| Gefundene Unternehmen | Relation | Relation zu „Unternehmen“ |
| Anzahl gefunden | Rollup | Zahl der verknüpften Unternehmen |
| Gestartet von | Person oder Auswahl | Ivan oder Jürgen |
| Gestartet am | Erstellungszeit | Automatisch |
| Abgeschlossen am | Datum | Automatisch nach Abschluss |
| Prüfhinweis | Text | Fehler, Dubletten oder fehlende Angaben |

## 3. Datenbank „Aktivitäten“

| Eigenschaft | Notion-Typ | Vorgabe |
|---|---|---|
| Aktivität | Titel | Kurze, eindeutige Bezeichnung |
| Unternehmen | Relation | Relation zu „Unternehmen“ |
| Art | Auswahl | Recherche; Anruf; E-Mail; Gespräch; Einladung; Zusage; Teilnahme; Angebot; Auftrag; Notiz |
| Ergebnis | Text | Sachlich dokumentiertes Ergebnis |
| Durchgeführt von | Person oder Auswahl | Ivan oder Jürgen |
| Datum | Datum | Zeitpunkt der Aktivität |
| Nächster Schritt | Text | Verbindliche Folgehandlung |
| Wiedervorlage | Datum | Fälligkeit |
| Status danach | Auswahl | Funnel-Stufe nach der Aktivität |

## 4. Datenbank „Veranstaltungen“

| Eigenschaft | Notion-Typ | Vorgabe |
|---|---|---|
| Veranstaltung | Titel | Veranstaltungsname |
| Termin | Datum | Beginn und Ende |
| Ort | Text | Veranstaltungsort |
| Kapazität | Zahl | Maximale Teilnehmerzahl |
| Unternehmen | Relation | Eingeladene bzw. teilnehmende Unternehmen |
| Eingeladen | Rollup | Anzahl Einladungen |
| Zugesagt | Rollup | Anzahl Zusagen |
| Erschienen | Rollup | Tatsächliche Teilnahme |
| Angebote | Rollup | Folgeangebote |
| Aufträge | Rollup | Gewonnene Aufträge |

## Empfohlene Ansichten

- „Ivans Tagesliste“: Verantwortlich = Ivan, Wiedervorlage heute oder überfällig, sortiert nach Priorität.
- „Neue Recherchefunde“: Status = Neu gefunden, gruppiert nach Rechercheauftrag.
- „Funnel“: Board nach Status.
- „A-Leads“: Priorität = A, Auftrag noch nicht abgeschlossen.
- „Veranstaltungszusagen“: Status = Veranstaltung zugesagt.
- „Datenqualität prüfen“: Quelle oder Telefon oder Geschäftsführung ist leer.

## Synchronisationsregel

Die CRM-ID ist der technische Schlüssel. Änderungen werden nicht über den Firmennamen zugeordnet. Vor jeder Übertragung wird anhand von CRM-ID, Website-Domain sowie Firmenname und PLZ auf Dubletten geprüft. Rechercheergebnisse erhalten im CRM stets den Status „Neu gefunden“, die Quelle „Deep Search“ und den verantwortlichen Bearbeiter Ivan.
