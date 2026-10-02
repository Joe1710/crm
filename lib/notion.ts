import { env } from "cloudflare:workers";
import { nextActionFor } from "./crm-stages";

const NOTION_VERSION = "2026-03-11";
const DEFAULT_COMPANIES_DATA_SOURCE = "dd3b532f-73a6-40c5-8784-91c1b0f1d203";
const DEFAULT_EVENTS_DATA_SOURCE = "3c96ee4d-e607-4b69-8293-c7211e8bb63a";

type CompanyForNotion = {
  id: number; name: string; city: string; address: string; distance: number; industry: string;
  employees: string; phone: string; email: string; website: string; manager: string; stage: string;
  priority: string; nextAction: string; nextDate: string; source: string; notes: string;
  originCity?: string; outreachStep?: number;
};

type EventForNotion = {
  id: number; title: string; location: string; address: string; startAt: string; endAt: string;
  capacity: number; status: string; notes: string;
  invited: number; confirmed: number; attended: number; offers: number; orders: number;
};

type NotionResponse = { id?: string; results?: Array<{ id: string }>; message?: string };

function config() {
  const runtime = env as unknown as { NOTION_TOKEN?: string; NOTION_COMPANIES_DATA_SOURCE_ID?: string; NOTION_EVENTS_DATA_SOURCE_ID?: string };
  return {
    token: runtime.NOTION_TOKEN?.trim(),
    companiesDataSourceId: runtime.NOTION_COMPANIES_DATA_SOURCE_ID?.trim() || DEFAULT_COMPANIES_DATA_SOURCE,
    eventsDataSourceId: runtime.NOTION_EVENTS_DATA_SOURCE_ID?.trim() || DEFAULT_EVENTS_DATA_SOURCE
  };
}

/**
 * Schreibt Eigenschaften nach Notion. Lehnt Notion einzelne Felder ab (Feld existiert nicht oder Auswahloption
 * ist im Status-Feld nicht angelegt), wird genau dieses Feld weggelassen und erneut gesendet – statt dass der
 * ganze Datensatz scheitert. Die übersprungenen Felder werden zurückgemeldet.
 */
async function writeWithFallback(path: string, method: "PATCH" | "POST", build: (props: Record<string, unknown>) => Record<string, unknown>, properties: Record<string, unknown>) {
  const props = { ...properties };
  const skipped: string[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const result = await notionRequest(path, { method, body: JSON.stringify(build(props)) });
      return { result, skipped };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const missing = message.match(/^(.+?) is not a property that exists/)?.[1]?.trim();
      const offending = missing ?? Object.keys(props).find(key => message.includes(key));
      if (!offending || !(offending in props) || offending === "Unternehmen" || offending === "Veranstaltung") throw error;
      delete props[offending];
      skipped.push(offending);
    }
  }
  throw new Error("Notion lehnt zu viele Felder ab – bitte Datenbank-Struktur prüfen.");
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

function safeEmployees(value: string) {
  const known = ["10–19", "20–49", "50–99", "100–249", "Unbekannt"];
  const stripped = value.replace(/\s*Mitarbeiter$/, "").trim();
  return known.includes(stripped) ? stripped : "Unbekannt";
}

function properties(company: CompanyForNotion): Record<string, unknown> {
  return {
    "Unternehmen": title(company.name),
    "CRM-Datensatz-ID": richText(String(company.id)),
    "Status": select(company.stage),
    "Priorität": select(company.priority),
    "Branche": select(safeIndustry(company.industry)),
    "Ausgangsstadt": richText(company.originCity ?? ""),
    "Mitarbeiterklasse": select(safeEmployees(company.employees)),
    "Ort": richText(company.city),
    "Anschrift": richText(company.address),
    "Entfernung zum Ausgangsort": { number: company.distance },
    "Geschäftsführung": richText(company.manager),
    "Telefon": { phone_number: company.phone || null },
    "E-Mail": { email: company.email || null },
    "Website": { url: company.website ? (company.website.startsWith("http") ? company.website : `https://${company.website}`) : null },
    "Quellenbezeichnung": richText(company.source),
    "Nächster Schritt": richText(nextActionFor(company.stage, company.outreachStep ?? 0).label),
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
    const { skipped } = await writeWithFallback(`/pages/${existingId}`, "PATCH", props => ({ properties: props }), properties(company));
    lastSkipped = skipped;
    return existingId;
  }
  const { result, skipped } = await writeWithFallback("/pages", "POST", props => ({ parent: { type: "data_source_id", data_source_id: companiesDataSourceId }, properties: props }), properties(company));
  lastSkipped = skipped;
  if (!result.id) throw new Error("Notion hat keine Seiten-ID zurückgegeben.");
  return result.id;
}

/** Felder, die beim letzten Schreibvorgang von Notion abgelehnt und deshalb weggelassen wurden. */
export let lastSkipped: string[] = [];

const EVENT_STATUS_OPTIONS = ["Planung", "Einladung", "Anmeldungsphase", "Durchgeführt", "Nachbearbeitung", "Abgeschlossen", "Abgesagt"];

function safeEventStatus(value: string) {
  return EVENT_STATUS_OPTIONS.includes(value) ? value : "Planung";
}

function eventProperties(event: EventForNotion): Record<string, unknown> {
  return {
    "Veranstaltung": title(event.title),
    "Status": select(safeEventStatus(event.status)),
    "Veranstaltungsort": richText(event.location),
    "Anschrift": richText(event.address),
    "Beginn": date(event.startAt),
    "Ende": date(event.endAt),
    "Kapazität": { number: event.capacity },
    "Eingeladen": { number: event.invited },
    "Zugesagt": { number: event.confirmed },
    "Erschienen": { number: event.attended },
    "Angebote": { number: event.offers },
    "Aufträge": { number: event.orders },
    "Notizen": richText(event.notes)
  };
}

async function findExistingEventPage(title: string) {
  const { eventsDataSourceId } = config();
  const result = await notionRequest(`/data_sources/${eventsDataSourceId}/query`, {
    method: "POST", body: JSON.stringify({ filter: { property: "Veranstaltung", title: { equals: title } }, page_size: 1 })
  });
  return result.results?.[0]?.id || null;
}

export async function syncEventToNotion(event: EventForNotion & { notionPageId?: string | null }) {
  const { eventsDataSourceId } = config();
  const existingId = event.notionPageId || await findExistingEventPage(event.title);
  if (existingId) {
    await writeWithFallback(`/pages/${existingId}`, "PATCH", props => ({ properties: props }), eventProperties(event));
    return existingId;
  }
  const { result } = await writeWithFallback("/pages", "POST", props => ({ parent: { type: "data_source_id", data_source_id: eventsDataSourceId }, properties: props }), eventProperties(event));
  if (!result.id) throw new Error("Notion hat keine Seiten-ID zurückgegeben.");
  return result.id;
}

export function notionConfigured() { return Boolean(config().token); }
