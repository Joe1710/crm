import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { activities, companies } from "../../../db/schema";
import { stageAfterEmail } from "../../../lib/crm-stages";
import { isPostalCandidate, POSTAL_STATUS } from "../../../lib/postal";
import { getSessionUser } from "../../../lib/session-auth";

/** Briefversand: Firmen vormerken, Vormerkung aufheben oder als per Post versendet markieren. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { action?: string; companyIds?: number[] };
    const ids = Array.from(new Set((body.companyIds ?? []).map(Number).filter(Number.isInteger)));
    if (!ids.length) return Response.json({ message: "Keine Unternehmen ausgewählt." }, { status: 400 });
    if (!["mark", "unmark", "sent"].includes(String(body.action))) return Response.json({ message: "Ungültige Aktion." }, { status: 400 });

    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db.select().from(companies).where(inArray(companies.id, ids));
    const updated = [];

    for (const company of rows) {
      if (body.action === "mark") {
        if (company.postalStatus === POSTAL_STATUS.sent || !isPostalCandidate(company)) continue;
        const [row] = await db.update(companies).set({ postalStatus: POSTAL_STATUS.marked, postalMarkedAt: now, updatedAt: now, notionSyncedAt: null }).where(eq(companies.id, company.id)).returning();
        updated.push(row);
      } else if (body.action === "unmark") {
        if (company.postalStatus !== POSTAL_STATUS.marked) continue;
        const [row] = await db.update(companies).set({ postalStatus: "", postalMarkedAt: null, updatedAt: now, notionSyncedAt: null }).where(eq(companies.id, company.id)).returning();
        updated.push(row);
      } else {
        if (company.postalStatus !== POSTAL_STATUS.marked) continue;
        const stage = stageAfterEmail(company.stage, 1);
        const [row] = await db.update(companies).set({
          postalStatus: POSTAL_STATUS.sent, postalSentAt: now,
          outreachStep: Math.max(company.outreachStep, 1), lastOutreachAt: now, lastActivityAt: now, awaitingReply: 1,
          stage, ...(stage !== company.stage ? { stageChangedAt: now } : {}),
          updatedAt: now, notionSyncedAt: null
        }).where(eq(companies.id, company.id)).returning();
        await db.insert(activities).values({ companyId: company.id, kind: "Brief", result: "", note: "Einladung 1 per Post versendet", createdBy: user.name, createdAt: now });
        updated.push(row);
      }
    }
    return Response.json({ companies: updated });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Speichern fehlgeschlagen." }, { status: 500 });
  }
}
