import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { activities, companies, outreachEmails } from "../../../../../db/schema";
import { ACTIVITY_KINDS, RESULT_OPTIONS } from "../../../../../lib/crm-stages";
import { getSessionUser } from "../../../../../lib/session-auth";

/** Historie: versendete E-Mails + selbst erfasste Aktivitäten (Anrufe, Gespräche, Notizen, Statuswechsel). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await context.params;
  const db = getDb();
  const [own, mails] = await Promise.all([
    db.select().from(activities).where(eq(activities.companyId, Number(id))).orderBy(desc(activities.createdAt)),
    db.select().from(outreachEmails).where(eq(outreachEmails.companyId, Number(id))).orderBy(desc(outreachEmails.sentAt))
  ]);
  const items = [
    ...own.map(a => ({ id: `a${a.id}`, at: a.createdAt, kind: a.kind, result: a.result, text: a.note, by: a.createdBy })),
    ...mails.map(m => ({
      id: `m${m.id}`, at: m.sentAt, kind: "E-Mail", result: "",
      text: `${m.stepNumber === 0 ? "Bestätigung" : m.stepNumber === 4 ? "Zusage-E-Mail (Bitte um Anmeldung)" : `${m.stepNumber}. E-Mail`} gesendet an ${m.sentTo}${m.triggeredBy === "auto" ? " (automatisch)" : ""}`,
      by: ""
    }))
  ].sort((a, b) => b.at.localeCompare(a.at));
  return Response.json({ items });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { kind?: string; result?: string; note?: string };
    const kind = (ACTIVITY_KINDS as readonly string[]).includes(String(body.kind)) ? String(body.kind) : "Notiz";
    const result = (RESULT_OPTIONS as readonly string[]).includes(String(body.result)) ? String(body.result) : "";
    const note = String(body.note ?? "").trim();
    if (!note && !result) return Response.json({ message: "Bitte Ergebnis oder Notiz angeben." }, { status: 400 });

    const db = getDb();
    const now = new Date().toISOString();
    const [activity] = await db.insert(activities).values({ companyId: Number(id), kind, result, note, createdBy: user.name, createdAt: now }).returning();
    const [company] = await db.update(companies).set({
      lastActivityAt: now,
      ...(result ? { lastResult: result, awaitingReply: 0 } : {}),
      updatedAt: now,
      notionSyncedAt: null
    }).where(eq(companies.id, Number(id))).returning();
    return Response.json({ activity, company }, { status: 201 });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Aktivität konnte nicht gespeichert werden." }, { status: 500 });
  }
}
