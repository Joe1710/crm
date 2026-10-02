import { asc, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies, events, notionSyncRuns } from "../../../../db/schema";
import { lastSkipped, notionConfigured, syncCompanyToNotion, syncEventToNotion } from "../../../../lib/notion";
import { getSessionUser } from "../../../../lib/session-auth";

// Cloudflare erlaubt pro Aufruf nur eine begrenzte Zahl externer Anfragen (Free-Plan: 50).
// Deshalb werden pro Aufruf nur wenige Firmen übertragen; die Oberfläche ruft so lange nach, bis alles übertragen ist.
const BATCH_SIZE = 8;
const CONFIRMED_STAGES = ["Zugesagt"];
// Teilnahme, Angebote und Aufträge werden im neuen Funnel nicht mehr als Stufe geführt.
const ATTENDED_STAGES: string[] = [];
const OFFER_STAGES: string[] = [];
const ORDER_STAGES: string[] = [];

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const db = getDb();
  const [lastRun] = await db.select().from(notionSyncRuns).orderBy(desc(notionSyncRuns.id)).limit(1);
  const pending = await db.select({ id: companies.id }).from(companies).where(isNull(companies.notionSyncedAt));
  const errors = await db.select({ id: companies.id, name: companies.name, error: companies.notionSyncError }).from(companies).where(isNotNull(companies.notionSyncError)).limit(10);
  return Response.json({ configured: notionConfigured(), pending: pending.length, errors, lastRun: lastRun || null });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!notionConfigured()) return Response.json({ message: "Notion ist vorbereitet, aber der geschützte Zugangsschlüssel fehlt noch.", configured: false }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { companyId?: number };
  const db = getDb();
  const startedAt = new Date().toISOString();
  const [run] = await db.insert(notionSyncRuns).values({ status: "Läuft", startedAt }).returning();
  const records = body.companyId
    ? await db.select().from(companies).where(eq(companies.id, Number(body.companyId))).limit(1)
    : await db.select().from(companies).where(or(isNull(companies.notionSyncedAt), isNotNull(companies.notionSyncError))).orderBy(asc(companies.id)).limit(BATCH_SIZE);
  let succeeded = 0; let failed = 0; let firstError = ""; const skippedFields = new Set<string>();
  for (const company of records) {
    try {
      const notionPageId = await syncCompanyToNotion(company);
      await db.update(companies).set({ notionPageId, notionSyncedAt: new Date().toISOString(), notionSyncError: null }).where(eq(companies.id, company.id));
      lastSkipped.forEach(field => skippedFields.add(field));
      succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Notion-Fehler";
      if (/too many subrequests/i.test(message)) break; // Kontingent dieses Aufrufs erschöpft – Rest beim nächsten Aufruf
      await db.update(companies).set({ notionSyncError: message }).where(eq(companies.id, company.id));
      if (!firstError) firstError = `${company.name}: ${message}`;
      failed++;
    }
  }
  const stillPending = (await db.select({ id: companies.id }).from(companies).where(isNull(companies.notionSyncedAt))).length;
  // Veranstaltungen erst übertragen, wenn alle Firmen durch sind (Anfragen-Kontingent)
  if (!body.companyId && stillPending === 0) {
    const allCompanies = await db.select({ stage: companies.stage, outreachStep: companies.outreachStep }).from(companies);
    const stats = {
      invited: allCompanies.filter(c => c.outreachStep >= 1).length,
      confirmed: allCompanies.filter(c => CONFIRMED_STAGES.includes(c.stage)).length,
      attended: allCompanies.filter(c => ATTENDED_STAGES.includes(c.stage)).length,
      offers: allCompanies.filter(c => OFFER_STAGES.includes(c.stage)).length,
      orders: allCompanies.filter(c => ORDER_STAGES.includes(c.stage)).length
    };
    const eventList = await db.select().from(events);
    for (const event of eventList) {
      try {
        const notionPageId = await syncEventToNotion({ ...event, ...stats });
        await db.update(events).set({ notionPageId, notionSyncedAt: new Date().toISOString(), notionSyncError: null }).where(eq(events.id, event.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unbekannter Notion-Fehler";
        await db.update(events).set({ notionSyncError: message }).where(eq(events.id, event.id));
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const remaining = (await db.select({ id: companies.id }).from(companies).where(isNull(companies.notionSyncedAt))).length;
  const errors = (await db.select({ id: companies.id }).from(companies).where(isNotNull(companies.notionSyncError))).length;
  const skippedNote = skippedFields.size ? ` In Notion fehlen die Felder: ${[...skippedFields].join(", ")}.` : "";
  const message = failed
    ? `${succeeded} synchronisiert, ${failed} mit Fehlern. Erster Fehler – ${firstError}`
    : `${succeeded} Unternehmen wurden mit Notion synchronisiert${remaining ? `, ${remaining} folgen beim nächsten Durchlauf` : ""}.${skippedNote}`;
  await db.update(notionSyncRuns).set({ status: failed ? "Mit Fehlern" : "Erfolgreich", processed: records.length, succeeded, failed, message, finishedAt }).where(eq(notionSyncRuns.id, run.id));
  return Response.json({ configured: true, processed: records.length, succeeded, failed, pending: remaining, errors, message });
}
