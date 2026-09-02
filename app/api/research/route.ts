import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies, researchJobs } from "../../../db/schema";
import { notionConfigured, syncCompanyToNotion } from "../../../lib/notion";
import { getSessionUser } from "../../../lib/session-auth";

type FoundCompany = {
  name: string;
  city: string;
  address: string;
  distance: number;
  industry: string;
  employees: string;
  phone: string;
  email: string;
  website: string;
  manager: string;
  legalForm: string;
  sourceUrls: string[];
  evidence: string;
};

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

const companySchema = {
  type: "object",
  properties: {
    companies: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          city: { type: "string" },
          address: { type: "string" },
          distance: { type: "number" },
          industry: { type: "string" },
          employees: { type: "string", enum: ["10–19", "20–49", "50–99", "100–249", "Unbekannt"] },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          manager: { type: "string" },
          legalForm: { type: "string" },
          sourceUrls: { type: "array", minItems: 1, items: { type: "string" } },
          evidence: { type: "string" }
        },
        required: ["name", "city", "address", "distance", "industry", "employees", "phone", "email", "website", "manager", "legalForm", "sourceUrls", "evidence"],
        additionalProperties: false
      }
    }
  },
  required: ["companies"],
  additionalProperties: false
};

function outputText(response: OpenAIResponse) {
  return (response.output || [])
    .filter(item => item.type === "message")
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("");
}

async function researchCompanies(criteria: { industry: string; radius: number; employees: string; legalForm: string; region: string }) {
  const runtime = env as unknown as { OPENAI_API_KEY?: string };
  const apiKey = runtime.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Die Tiefensuche ist noch nicht aktiviert: OPENAI_API_KEY fehlt.");

  const prompt = `Recherchiere genau 10 unterschiedliche, real existierende kleine oder mittelständische Unternehmen für die Akquisition der KI Masterclass.

Suchkriterien:
- Ausgangspunkt: Nürnberg
- maximaler Radius: ${criteria.radius} km
- regionaler Schwerpunkt: ${criteria.region}
- Branche: ${criteria.industry}
- Unternehmensgröße: ${criteria.employees}
- Rechtsform: ${criteria.legalForm}

Qualitätsregeln:
- Nutze aktuelle, öffentlich zugängliche Webquellen und bevorzuge offizielle Unternehmenswebseiten, Impressum, Handelsregister-nahe Quellen und seriöse Branchenverzeichnisse.
- Nenne nur Unternehmen, deren tatsächliche Existenz und Standort durch mindestens eine URL belegt sind.
- Erfinde niemals Telefonnummern, E-Mail-Adressen, Geschäftsführungen, Mitarbeiterzahlen oder Anschriften. Trage bei nicht belegten Textangaben eine leere Zeichenfolge ein; bei der Mitarbeiterklasse "Unbekannt".
- sourceUrls muss alle zur Prüfung verwendeten direkten URLs enthalten.
- distance ist die plausible Entfernung in Kilometern von Nürnberg und darf ${criteria.radius} nicht überschreiten.
- Keine Konzerne, Behörden, Vereine, Schulen oder bereits geschlossenen Unternehmen.
- evidence fasst knapp zusammen, welche Angaben durch welche Quellen belegt sind.
- Gib exakt 10 Treffer im vorgegebenen JSON-Schema aus.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      tools: [{ type: "web_search" }],
      input: prompt,
      reasoning: { effort: "medium" },
      text: { format: { type: "json_schema", name: "company_research", strict: true, schema: companySchema } }
    })
  });
  const result = await response.json() as OpenAIResponse;
  if (!response.ok) throw new Error(result.error?.message || `OpenAI-Fehler ${response.status}`);
  const text = outputText(result);
  if (!text) throw new Error("Die Tiefensuche hat keine auswertbaren Unternehmensdaten geliefert.");
  const parsed = JSON.parse(text) as { companies?: FoundCompany[] };
  return (parsed.companies || []).filter(company => company.name && company.city && company.sourceUrls?.length).slice(0, 10);
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
    return Response.json({ message: error instanceof Error ? error.message : "Tiefensuche konnte nicht abgeschlossen werden." }, { status: 500 });
  }
}
