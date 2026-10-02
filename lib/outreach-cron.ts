import { env } from "cloudflare:workers";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { getDb } from "../db";
import { companies } from "../db/schema";
import { sendOutreachEmail } from "./send-outreach";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Automatischer Nachversand von E-Mail 2 und 3 nach 14 Tagen ohne Antwort.
 * Seit dem Umbau vom 01.10.2026 standardmäßig AUS: Fällige Kontakte erscheinen stattdessen unter „Aufgaben“
 * und werden dort bewusst abgearbeitet. Einschalten nur mit der Umgebungsvariable OUTREACH_AUTO_SEND=true.
 */
export async function runOutreachAutoAdvance() {
  const runtime = env as unknown as { OUTREACH_AUTO_SEND?: string };
  if (runtime.OUTREACH_AUTO_SEND?.trim().toLowerCase() !== "true") return { processed: 0, skipped: "auto-send disabled" };

  const db = getDb();
  const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();
  const due = await db.select().from(companies).where(
    and(
      eq(companies.awaitingReply, 1),
      lt(companies.outreachStep, 3),
      inArray(companies.stage, ["1. Kontakt", "2. Kontakt"]),
      eq(companies.lastResult, ""),
      isNotNull(companies.lastOutreachAt),
      lt(companies.lastOutreachAt, cutoff)
    )
  );

  let processed = 0;
  for (const company of due) {
    try {
      await sendOutreachEmail({ companyId: company.id, step: company.outreachStep + 1, triggeredBy: "auto" });
      processed += 1;
    } catch {
      // einzelne Fehler (z. B. ungültige Adresse) dürfen den Lauf nicht abbrechen
    }
  }
  return { processed };
}
