import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies, notionSyncRuns } from "../../../../db/schema";
import { fetchAllNotionCompanies, notionConfigured, syncCompanyToNotion } from "../../../../lib/notion";
import { getSessionUser } from "../../../../lib/session-auth";

type Company = typeof companies.$inferSelect;

function isPendingPush(company: Company) {
  return !company.notionPageId || !company.notionLastEditedAt || company.updatedAt > company.notionLastEditedAt;
}

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const db = getDb();
  const [lastRun] = await db.select().from(notionSyncRuns).orderBy(desc(notionSyncRuns.id)).limit(1);
  const all = await db.select().from(companies);
  const pending = all.filter(isPendingPush);
  return Response.json({ configured: notionConfigured(), pending: pending.length, lastRun: lastRun || null });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!notionConfigured()) return Response.json({ message: "Notion ist vorbereitet, aber der geschützte Zugangsschlüssel fehlt noch.", configured: false }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { companyId?: number };
  const db = getDb();
  const startedAt = new Date().toISOString();
  const [run] = await db.insert(notionSyncRuns).values({ status: "Läuft", startedAt }).returning();

  let created = 0, pulled = 0, pushed = 0, failed = 0;

  try {
    if (body.companyId) {
      // Gezielter Push eines einzelnen Datensatzes (z. B. nach einer Feldänderung im CRM).
      const [company] = await db.select().from(companies).where(eq(companies.id, Number(body.companyId))).limit(1);
      if (company) {
        try {
          const result = await syncCompanyToNotion(company);
          await db.update(companies).set({ notionPageId: result.id, notionSyncedAt: new Date().toISOString(), notionLastEditedAt: result.lastEditedTime, notionSyncError: null }).where(eq(companies.id, company.id));
          pushed++;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unbekannter Notion-Fehler";
          await db.update(companies).set({ notionSyncError: message }).where(eq(companies.id, company.id));
          failed++;
        }
      }
    } else {
      // Voller bidirektionaler Abgleich: zuerst Notion-Änderungen einlesen, danach lokale Änderungen zurückschreiben.
      const localCompanies = await db.select().from(companies);
      const byId = new Map(localCompanies.map(c => [c.id, c]));
      const byNotionPageId = new Map(localCompanies.filter(c => c.notionPageId).map(c => [c.notionPageId as string, c]));

      const notionRecords = await fetchAllNotionCompanies();
      for (const record of notionRecords) {
        const existing = byNotionPageId.get(record.notionPageId) || (record.crmId ? byId.get(record.crmId) : undefined);
        if (!existing) {
          const [createdCompany] = await db.insert(companies).values({
            name: record.name || "Ohne Namen", city: record.city, address: record.address, distance: record.distance,
            industry: record.industry, employees: record.employees, phone: record.phone, email: record.email,
            website: record.website, manager: record.manager, stage: record.stage, priority: record.priority,
            owner: "Ivan", nextAction: record.nextAction, nextDate: record.nextDate, source: record.source || "Notion",
            notes: record.notes, notionPageId: record.notionPageId, notionSyncedAt: new Date().toISOString(),
            notionLastEditedAt: record.notionLastEditedAt, updatedAt: record.notionLastEditedAt
          }).returning();
          created++;
          try { await syncCompanyToNotion({ ...createdCompany, notionPageId: record.notionPageId }); } catch { /* CRM-ID-Rückschreibung ist optional */ }
          continue;
        }

        const notionSeenBefore = existing.notionLastEditedAt;
        const notionChangedSinceSync = !notionSeenBefore || record.notionLastEditedAt > notionSeenBefore;
        const localChangedSinceSync = !notionSeenBefore || existing.updatedAt > notionSeenBefore;
        if (!notionChangedSinceSync) continue;
        // Zuletzt geändert gewinnt: nur übernehmen, wenn Notion nicht älter ist als der lokale Stand.
        if (localChangedSinceSync && existing.updatedAt > record.notionLastEditedAt) continue;

        await db.update(companies).set({
          name: record.name || existing.name, city: record.city, address: record.address, distance: record.distance,
          industry: record.industry, employees: record.employees, phone: record.phone, email: record.email,
          website: record.website, manager: record.manager, stage: record.stage, priority: record.priority,
          nextAction: record.nextAction, nextDate: record.nextDate, notes: record.notes,
          notionPageId: record.notionPageId, notionLastEditedAt: record.notionLastEditedAt,
          notionSyncedAt: new Date().toISOString(), updatedAt: record.notionLastEditedAt
        }).where(eq(companies.id, existing.id));
        pulled++;
        byId.set(existing.id, { ...existing, updatedAt: record.notionLastEditedAt, notionLastEditedAt: record.notionLastEditedAt });
      }

      const refreshed = await db.select().from(companies);
      const pending = refreshed.filter(isPendingPush).slice(0, 50);
      for (const company of pending) {
        try {
          const result = await syncCompanyToNotion(company);
          await db.update(companies).set({ notionPageId: result.id, notionSyncedAt: new Date().toISOString(), notionLastEditedAt: result.lastEditedTime, notionSyncError: null }).where(eq(companies.id, company.id));
          pushed++;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unbekannter Notion-Fehler";
          await db.update(companies).set({ notionSyncError: message }).where(eq(companies.id, company.id));
          failed++;
        }
      }
    }
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : "Unbekannter Notion-Fehler";
    await db.update(notionSyncRuns).set({ status: "Mit Fehlern", message, finishedAt: new Date().toISOString() }).where(eq(notionSyncRuns.id, run.id));
    return Response.json({ configured: true, message }, { status: 502 });
  }

  const succeeded = created + pulled + pushed;
  const finishedAt = new Date().toISOString();
  await db.update(notionSyncRuns).set({
    status: failed ? "Mit Fehlern" : "Erfolgreich", processed: succeeded + failed, succeeded, failed,
    message: failed ? `${failed} Datensätze prüfen` : `${created} neu aus Notion, ${pulled} aktualisiert, ${pushed} nach Notion gesendet`,
    finishedAt
  }).where(eq(notionSyncRuns.id, run.id));

  return Response.json({
    configured: true, created, pulled, pushed, failed,
    message: failed ? `${succeeded} synchronisiert, ${failed} mit Fehlern.` : `${created} neu aus Notion, ${pulled} aktualisiert, ${pushed} nach Notion gesendet.`
  });
}
