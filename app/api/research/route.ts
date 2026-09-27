import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies, researchJobs } from "../../../db/schema";
import { notionConfigured, syncCompanyToNotion } from "../../../lib/notion";
import { ResearchApiError, researchCompanies, researchConfigured } from "../../../lib/openai-research";
import { getSessionUser } from "../../../lib/session-auth";

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  return Response.json({ configured: researchConfigured(), provider: "OpenAI Web Search" });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const db = getDb();
  let jobId: number | undefined;
  try {
    const body = await request.json() as Record<string, unknown>;
    const industry = String(body.industry ?? "").trim();
    const radius = Number(body.radius ?? 0);
    if (!industry || radius < 10 || radius > 100) {
      return Response.json({ message: "Bitte Branche und einen Umkreis zwischen 10 und 100 km angeben." }, { status: 400 });
    }
    const criteria = {
      industry,
      radius,
      employees: String(body.employees ?? "10–249 Mitarbeiter"),
      legalForm: String(body.legalForm ?? "Alle Rechtsformen"),
      region: String(body.region ?? "Nürnberg, Fürth und Erlangen")
    };

    const [job] = await db.insert(researchJobs).values({
      ...criteria,
      resultLimit: 10,
      status: "Tiefensuche läuft",
      provider: "OpenAI Web Search"
    }).returning();
    jobId = job.id;

    const found = await researchCompanies(criteria);
    const existing = await db.select({ name: companies.name, website: companies.website }).from(companies);
    const knownNames = new Set(existing.map(item => item.name.trim().toLocaleLowerCase("de")));
    const knownWebsites = new Set(existing.map(item => item.website.trim().toLocaleLowerCase("de")).filter(Boolean));
    const inserted = [];

    for (const candidate of found) {
      const normalizedName = candidate.name.trim().toLocaleLowerCase("de");
      const normalizedWebsite = candidate.website.trim().toLocaleLowerCase("de").replace(/\/$/, "");
      if (knownNames.has(normalizedName) || (normalizedWebsite && knownWebsites.has(normalizedWebsite))) continue;
      const [company] = await db.insert(companies).values({
        name: candidate.name.trim(),
        city: candidate.city.trim(),
        address: candidate.address.trim(),
        distance: Math.min(radius, Math.max(0, Number(candidate.distance) || 0)),
        industry: candidate.industry.trim() || industry,
        employees: candidate.employees || "Unbekannt",
        phone: candidate.phone.trim(),
        email: candidate.email.trim(),
        website: candidate.website.trim(),
        manager: candidate.manager.trim(),
        stage: "Neu gefunden",
        priority: "B",
        owner: "Ivan",
        nextAction: "Quellen prüfen und Entscheider qualifizieren",
        nextDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        source: candidate.sourceUrls.join(" | "),
        notes: candidate.evidence.trim(),
        updatedAt: new Date().toISOString()
      }).returning();
      inserted.push(company);
      knownNames.add(normalizedName);
      if (normalizedWebsite) knownWebsites.add(normalizedWebsite);
    }

    let notionSucceeded = 0;
    let notionFailed = 0;
    if (notionConfigured()) {
      for (const company of inserted) {
        try {
          const notionPageId = await syncCompanyToNotion(company);
          await db.update(companies).set({ notionPageId, notionSyncedAt: new Date().toISOString(), notionSyncError: null }).where(eq(companies.id, company.id));
          company.notionPageId = notionPageId;
          company.notionSyncedAt = new Date().toISOString();
          notionSucceeded++;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Notion-Synchronisation fehlgeschlagen";
          await db.update(companies).set({ notionSyncError: message }).where(eq(companies.id, company.id));
          company.notionSyncError = message;
          notionFailed++;
        }
      }
    }

    const status = inserted.length === 10 ? "10 Treffer gespeichert" : `${inserted.length} neue Treffer gespeichert`;
    await db.update(researchJobs).set({ status }).where(eq(researchJobs.id, job.id));
    return Response.json({
      job: { ...job, status },
      companies: inserted,
      notion: { succeeded: notionSucceeded, failed: notionFailed },
      message: `${inserted.length} reale Unternehmen wurden gespeichert${notionConfigured() ? `; ${notionSucceeded} davon nach Notion übertragen` : ""}.`
    }, { status: 201 });
  } catch (error) {
    if (jobId) await db.update(researchJobs).set({ status: "Fehlgeschlagen" }).where(eq(researchJobs.id, jobId)).catch(() => undefined);
    const status = error instanceof ResearchApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Tiefensuche konnte nicht abgeschlossen werden." }, { status });
  }
}
