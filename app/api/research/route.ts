import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies, researchJobs } from "../../../db/schema";
import { notionConfigured, syncCompanyToNotion } from "../../../lib/notion";
import { ResearchApiError, researchCompanies, researchConfigured } from "../../../lib/openai-research";
import { DEFAULT_ORIGIN_CITY, isValidOriginCity } from "../../../lib/german-cities";
import { hasCompletePostalAddress, hasValidEmail } from "../../../lib/postal";
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
    const requestedCity = String(body.originCity ?? "");
    const originCity = isValidOriginCity(requestedCity) ? requestedCity : DEFAULT_ORIGIN_CITY;
    const criteria = {
      originCity,
      industry,
      radius,
      employees: String(body.employees ?? "10–249 Mitarbeiter"),
      legalForm: String(body.legalForm ?? "Alle Rechtsformen"),
      region: String(body.region ?? "").trim() || `${originCity} und Umgebung`
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

    let skippedWithoutContact = 0;
    let letterOnly = 0;
    for (const candidate of found) {
      // Kontaktweg: E-Mail ODER vollständige Postanschrift (Brief). Ohne beides kann nicht eingeladen werden.
      const hasEmail = hasValidEmail(candidate.email);
      if (!hasEmail && !hasCompletePostalAddress(candidate.address)) { skippedWithoutContact++; continue; }
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
        email: hasEmail ? candidate.email.trim() : "",
        website: candidate.website.trim(),
        manager: candidate.manager.trim(),
        stage: "Neu",
        stageChangedAt: new Date().toISOString(),
        originCity,
        priority: "B",
        owner: "Ivan",
        nextAction: hasEmail ? "Quellen prüfen und Entscheider qualifizieren" : "Quellen prüfen – Brief per Post vorbereiten",
        nextDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        source: [candidate.sourceUrls.join(" | "), candidate.evidence.trim() ? `Beleg: ${candidate.evidence.trim()}` : ""].filter(Boolean).join(" — "),
        notes: "",
        updatedAt: new Date().toISOString()
      }).returning();
      inserted.push(company);
      if (!hasEmail) letterOnly++;
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
      message: `${inserted.length} Unternehmen gespeichert${letterOnly ? ` (davon ${letterOnly} ohne E-Mail, aber mit vollständiger Postanschrift – für Briefversand gekennzeichnet)` : ""}${skippedWithoutContact ? `, ${skippedWithoutContact} ohne E-Mail und ohne vollständige Anschrift verworfen` : ""}${notionConfigured() ? `; ${notionSucceeded} nach Notion übertragen` : ""}.`
    }, { status: 201 });
  } catch (error) {
    if (jobId) await db.update(researchJobs).set({ status: "Fehlgeschlagen" }).where(eq(researchJobs.id, jobId)).catch(() => undefined);
    const status = error instanceof ResearchApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Tiefensuche konnte nicht abgeschlossen werden." }, { status });
  }
}
