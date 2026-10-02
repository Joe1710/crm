import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activities, companies } from "../../../../db/schema";
import { RESULT_OPTIONS } from "../../../../lib/crm-stages";
import { getSessionUser } from "../../../../lib/session-auth";

/** Kompatibilität: erfasst eine Rückmeldung als Aktivität (ohne Stufenwechsel). */
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { companyId?: number; outcome?: string };
    if (!body.companyId) return Response.json({ message: "Unternehmen fehlt." }, { status: 400 });
    if (!body.outcome || !(RESULT_OPTIONS as readonly string[]).includes(body.outcome)) return Response.json({ message: "Ungültiges Ergebnis." }, { status: 400 });
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(activities).values({ companyId: Number(body.companyId), kind: "E-Mail", result: body.outcome, note: "Antwort erhalten", createdBy: sessionUser.name, createdAt: now });
    const [company] = await db.update(companies).set({ awaitingReply: 0, lastResult: body.outcome, lastActivityAt: now, updatedAt: now, notionSyncedAt: null }).where(eq(companies.id, Number(body.companyId))).returning();
    return Response.json({ company, stage: company?.stage });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Konnte nicht gespeichert werden." }, { status: 500 });
  }
}
