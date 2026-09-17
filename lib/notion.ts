import { env } from "cloudflare:workers";

const NOTION_VERSION = "2026-03-11";
const DEFAULT_COMPANIES_DATA_SOURCE = "dd3b532f-73a6-40c5-8784-91c1b0f1d203";

type CompanyForNotion = {
  id: number; name: string; city: string; address: string; distance: number; industry: string;
  employees: string; phone: string; email: string; website: string; manager: string; stage: string;
  priority: string; nextAction: string; nextDate: string; source: string; notes: string;
};

type NotionPage = { id: string; last_edited_time: string; properties?: Record<string, any> };
type NotionResponse = { id?: string; last_edited_time?: string; results?: NotionPage[]; has_more?: boolean; next_cursor?: string | null; message?: string };

export type NotionCompanyRecord = {
  notionPageId: string; notionLastEditedAt: string; crmId: number | null;
  name: string; city: string; address: string; distance: number; industry: string;
  employees: string; phone: string; email: string; website: string; manager: string;
  stage: string; priority: string; source: string; nextAction: string; nextDate: string; notes: string;
};

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

const readTitle = (prop: any): string => prop?.title?.[0]?.plain_text ?? prop?.title?.[0]?.text?.content ?? "";
const readRichText = (prop: any): string => prop?.rich_text?.[0]?.plain_text ?? prop?.rich_text?.[0]?.text?.content ?? "";
const readSelect = (prop: any): string => prop?.select?.name ?? "";
const readPhone = (prop: any): string => prop?.phone_number ?? "";
const readEmail = (prop: any): string => prop?.email ?? "";
const readUrl = (prop: any): string => prop?.url ?? "";
const readDate = (prop: any): string => prop?.date?.start ?? "";
const readNumber = (prop: any): number => typeof prop?.number === "number" ? prop.number : 0;

function fromNotionPage(page: NotionPage): NotionCompanyRecord {
  const p = page.properties || {};
  const crmIdText = readRichText(p["CRM-Datensatz-ID"]);
  return {
    notionPageId: page.id, notionLastEditedAt: page.last_edited_time, crmId: crmIdText ? Number(crmIdText) : null,
    name: readTitle(p["Unternehmen"]), city: readRichText(p["Ort"]), address: readRichText(p["Anschrift"]),
    distance: readNumber(p["Entfernung zum Ausgangspunkt"]), industry: readSelect(p["Branche"]) || "Sonstige",
    employees: readSelect(p["Mitarbeiterklasse"]), phone: readPhone(p["Telefon"]), email: readEmail(p["E-Mail"]),
    website: readUrl(p["Website"]), manager: readRichText(p["Geschäftsführung"]),
    stage: readSelect(p["Status"]) || "Neu gefunden", priority: readSelect(p["Priorität"]) || "B",
    source: readRichText(p["Quellenbezeichnung"]), nextAction: readRichText(p["Nächster Schritt"]),
    nextDate: readDate(p["Wiedervorlage"]), notes: readRichText(p["Notizen"])
  };
}

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
    "Entfernung zum Ausgangspunkt": { number: company.distance },
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
    const updated = await notionRequest(`/pages/${existingId}`, { method: "PATCH", body: JSON.stringify({ properties: properties(company) }) });
    return { id: existingId, lastEditedTime: updated.last_edited_time || new Date().toISOString() };
  }
  const created = await notionRequest("/pages", {
    method: "POST",
    body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: companiesDataSourceId }, properties: properties(company) })
  });
  if (!created.id) throw new Error("Notion hat keine Seiten-ID zurückgegeben.");
  return { id: created.id, lastEditedTime: created.last_edited_time || new Date().toISOString() };
}

export async function fetchAllNotionCompanies(maxRecords = 300): Promise<NotionCompanyRecord[]> {
  const { companiesDataSourceId } = config();
  const results: NotionCompanyRecord[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const response = await notionRequest(`/data_sources/${companiesDataSourceId}/query`, { method: "POST", body: JSON.stringify(body) });
    for (const page of response.results || []) results.push(fromNotionPage(page));
    cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
  } while (cursor && results.length < maxRecords);
  return results;
}

export function notionConfigured() { return Boolean(config().token); }
