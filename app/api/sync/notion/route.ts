import { asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies, notionSyncRuns } from "../../../../db/schema";
import { notionConfigured, syncCompanyToNotion } from "../../../../lib/notion";

export async function GET() {
  const db = getDb();
  const [lastRun] = await db.select().from(notionSyncRuns).orderBy(desc(notionSyncRuns.id)).limit(1);
  const pending = await db.select({ id: companies.id }).from(companies).where(isNull(companies.notionSyncedAt));
  return Response.json({ configured: notionConfigured(), pending: pending.length, lastRun: lastRun || null });
}

export async function POST(request: Request) {
  if (!notionConfigured()) return Response.json({ message: "Notion ist vorbereitet, aber der geschützte Zugangsschlüssel fehlt noch.", configured: false }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { companyId?: number };
  const db = getDb();
  const startedAt = new Date().toISOString();
  const [run] = await db.insert(notionSyncRuns).values({ status: "Läuft", startedAt }).returning();
  const records = body.companyId
    ? await db.select().from(companies).where(eq(companies.id, Number(body.companyId))).limit(1)
    : await db.select().from(companies).orderBy(asc(companies.id)).limit(20);
  let succeeded = 0; let failed = 0;
  for (const company of records) {
    try {
      const notionPageId = await syncCompanyToNotion(company);
      await db.update(companies).set({ notionPageId, notionSyncedAt: new Date().toISOString(), notionSyncError: null }).where(eq(companies.id, company.id));
      succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Notion-Fehler";
      await db.update(companies).set({ notionSyncError: message }).where(eq(companies.id, company.id));
      failed++;
    }
  }
  const finishedAt = new Date().toISOString();
  await db.update(notionSyncRuns).set({ status: failed ? "Mit Fehlern" : "Erfolgreich", processed: records.length, succeeded, failed, message: failed ? `${failed} Datensätze prüfen` : "Synchronisation abgeschlossen", finishedAt }).where(eq(notionSyncRuns.id, run.id));
  return Response.json({ configured: true, processed: records.length, succeeded, failed, message: failed ? `${succeeded} synchronisiert, ${failed} mit Fehlern.` : `${succeeded} Unternehmen wurden mit Notion synchronisiert.` });
}
