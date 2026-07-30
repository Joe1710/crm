import { env } from "cloudflare:workers";

const NOTION_VERSION = "2026-03-11";
const DEFAULT_COMPANIES_DATA_SOURCE = "dd3b532f-73a6-40c5-8784-91c1b0f1d203";

type CompanyForNotion = {
  id: number; name: string; city: string; address: string; distance: number; industry: string;
  employees: string; phone: string; email: string; website: string; manager: string; stage: string;
  priority: string; nextAction: string; nextDate: string; source: string; notes: string;
};

type NotionResponse = { id?: string; results?: Array<{ id: string }>; message?: string };

function config() {
  const runtime = env as unknown as { NOTION_TOKEN?: string; NOTION_COMPANIES_DATA_SOURCE_ID?: string };
  return {
    token: runtime.NOTION_TOKEN?.trim(),
    companiesDataSourceId: runtime.NOTION_COMPANIES_DATA_SOURCE_ID?.trim() || DEFAULT_COMPANIES_DATA_SOURCE
  };
}

async function notionRequest(path: string, init: RequestInit) {
  const { token } = config();
  if (!token) throw new Error("Notion ist noch nicht verbunden: NOTION_TOKEN fehlt.");
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: { "Authorization": `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const body = await response.json() as NotionResponse;
  if (!response.ok) throw new Error(body.message || `Notion-Fehler ${response.status}`);
  return body;
}

const richText = (value: string) => ({ rich_text: value ? [{ type: "text", text: { content: value.slice(0, 1900) } }] : [] });
const title = (value: string) => ({ title: [{ type: "text", text: { content: value.slice(0, 1900) } }] });
const select = (value: string) => ({ select: value ? { name: value } : null });
const date = (value: string) => ({ date: value ? { start: value } : null });

function safeIndustry(value: string) {
  return ["Maschinenbau", "IT-Dienstleistungen", "Medizintechnik", "Logistik", "Elektrotechnik", "Gebäudetechnik", "Sonstige"].includes(value) ? value : "Sonstige";
}

function properties(company: CompanyForNotion) {
  return {
    "Unternehmen": title(company.name),
    "CRM-Datensatz-ID": richText(String(company.id)),
    "Status": select(company.stage),
    "Priorität": select(company.priority),
    "Branche": select(safeIndustry(company.industry)),
    "Mitarbeiterklasse": select(company.employees || "Unbekannt"),
    "Ort": richText(company.city),
    "Anschrift": richText(company.address),
    "Entfernung Nürnberg": { number: company.distance },
    "Geschäftsführung": richText(company.manager),
    "Telefon": { phone_number: company.phone || null },
    "E-Mail": { email: company.email || null },
    "Website": { url: company.website ? (company.website.startsWith("http") ? company.website : `https://${company.website}`) : null },
    "Quellenbezeichnung": richText(company.source),
    "Nächster Schritt": richText(company.nextAction),
    "Wiedervorlage": date(company.nextDate),
    "Notizen": richText(company.notes),
    "Synchronisiert am": { date: { start: new Date().toISOString() } }
  };
}

async function findExistingPage(companyId: number) {
  const { companiesDataSourceId } = config();
  const result = await notionRequest(`/data_sources/${companiesDataSourceId}/query`, {
    method: "POST", body: JSON.stringify({ filter: { property: "CRM-Datensatz-ID", rich_text: { equals: String(companyId) } }, page_size: 1 })
  });
  return result.results?.[0]?.id || null;
}

export async function syncCompanyToNotion(company: CompanyForNotion & { notionPageId?: string | null }) {
  const { companiesDataSourceId } = config();
  const existingId = company.notionPageId || await findExistingPage(company.id);
  if (existingId) {
    await notionRequest(`/pages/${existingId}`, { method: "PATCH", body: JSON.stringify({ properties: properties(company) }) });
    return existingId;
  }
  const created = await notionRequest("/pages", {
    method: "POST",
    body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: companiesDataSourceId }, properties: properties(company) })
  });
  if (!created.id) throw new Error("Notion hat keine Seiten-ID zurückgegeben.");
  return created.id;
}

export function notionConfigured() { return Boolean(config().token); }
