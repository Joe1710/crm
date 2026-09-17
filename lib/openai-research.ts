import { env } from "cloudflare:workers";

export type ResearchCriteria = {
  industry: string;
  radius: number;
  employees: string;
  legalForm: string;
  region: string;
  originCity: string;
};

export type FoundCompany = {
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

type OpenAIRuntime = {
  OPENAI_API_KEY?: string;
  OPENAI_RESEARCH_MODEL?: string;
};

export class ResearchApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ResearchApiError";
  }
}

const companySchema = {
  type: "object",
  properties: {
    companies: {
      type: "array",
      minItems: 1,
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

function config() {
  const runtime = env as unknown as OpenAIRuntime;
  return {
    apiKey: runtime.OPENAI_API_KEY?.trim(),
    model: runtime.OPENAI_RESEARCH_MODEL?.trim() || "gpt-5.4-mini"
  };
}

export function researchConfigured() {
  return Boolean(config().apiKey);
}

function outputText(response: OpenAIResponse) {
  return (response.output || [])
    .filter(item => item.type === "message")
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("");
}

function validWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanCompany(company: FoundCompany, criteria: ResearchCriteria): FoundCompany | null {
  const name = String(company.name || "").trim();
  const city = String(company.city || "").trim();
  const sourceUrls = Array.from(new Set((company.sourceUrls || []).map(String).map(validWebUrl).filter((url): url is string => Boolean(url))));
  const distance = Number(company.distance);
  if (!name || !city || sourceUrls.length === 0 || !Number.isFinite(distance) || distance < 0 || distance > criteria.radius) return null;

  return {
    name,
    city,
    address: String(company.address || "").trim(),
    distance,
    industry: String(company.industry || "").trim() || criteria.industry,
    employees: String(company.employees || "Unbekannt").trim() || "Unbekannt",
    phone: String(company.phone || "").trim(),
    email: String(company.email || "").trim(),
    website: String(company.website || "").trim(),
    manager: String(company.manager || "").trim(),
    legalForm: String(company.legalForm || "").trim(),
    sourceUrls,
    evidence: String(company.evidence || "").trim()
  };
}

export async function researchCompanies(criteria: ResearchCriteria) {
  const { apiKey, model } = config();
  if (!apiKey) throw new ResearchApiError("Die Tiefensuche ist noch nicht aktiviert. Bitte OPENAI_API_KEY als geschützten Schlüssel hinterlegen.", 503);

  const prompt = `Recherchiere bis zu 10 unterschiedliche, real existierende kleine oder mittelständische Unternehmen für die Akquisition der KI Masterclass.

Suchkriterien:
- Ausgangspunkt: ${criteria.originCity}
- maximaler Radius: ${criteria.radius} km
- regionaler Schwerpunkt: ${criteria.region}
- Branche: ${criteria.industry}
- Unternehmensgröße: ${criteria.employees}
- Rechtsform: ${criteria.legalForm}

Qualitätsregeln:
- Nutze aktuelle, öffentlich zugängliche Webquellen. Bevorzuge die offizielle Unternehmenswebsite und deren Impressum; ergänze nur bei Bedarf seriöse Register oder Branchenverzeichnisse.
- Nenne nur Unternehmen, deren Existenz und Standort durch mindestens eine direkte URL belegt sind.
- Erfinde keine Telefonnummern, E-Mail-Adressen, Geschäftsführungen, Mitarbeiterzahlen oder Anschriften. Nutze für unbelegte Textangaben eine leere Zeichenfolge und für die Mitarbeiterklasse "Unbekannt".
- sourceUrls enthält ausschließlich direkte URLs, die du tatsächlich zur Prüfung verwendet hast.
- distance ist die plausible Entfernung in Kilometern von ${criteria.originCity} und darf ${criteria.radius} nicht überschreiten.
- Keine Konzerne, Behörden, Vereine, Schulen, dauerhaft geschlossenen Unternehmen oder Dubletten.
- evidence fasst knapp zusammen, welche Angaben durch die Quellen belegt sind.
- Qualität geht vor Anzahl: Liefere weniger als 10 Treffer, wenn 10 Unternehmen nicht zuverlässig belegbar sind.`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        input: prompt,
        reasoning: { effort: "low" },
        max_tool_calls: 12,
        max_output_tokens: 10000,
        store: false,
        text: { format: { type: "json_schema", name: "company_research", strict: true, schema: companySchema } }
      }),
      signal: AbortSignal.timeout(280_000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ResearchApiError("Die Tiefensuche hat das Zeitlimit überschritten. Bitte erneut versuchen.", 504);
    }
    throw new ResearchApiError("OpenAI ist momentan nicht erreichbar. Bitte später erneut versuchen.", 502);
  }

  let result: OpenAIResponse;
  try {
    result = await response.json() as OpenAIResponse;
  } catch {
    throw new ResearchApiError("OpenAI hat eine ungültige Antwort geliefert.", 502);
  }
  if (!response.ok) {
    const message = result.error?.message || `OpenAI-Fehler ${response.status}`;
    throw new ResearchApiError(message, response.status === 429 ? 429 : 502);
  }

  const text = outputText(result);
  if (!text) throw new ResearchApiError("Die Tiefensuche hat keine auswertbaren Unternehmensdaten geliefert.", 502);

  let parsed: { companies?: FoundCompany[] };
  try {
    parsed = JSON.parse(text) as { companies?: FoundCompany[] };
  } catch {
    throw new ResearchApiError("Die Unternehmensdaten konnten nicht ausgewertet werden.", 502);
  }

  const seen = new Set<string>();
  return (parsed.companies || []).flatMap(company => {
    const cleaned = cleanCompany(company, criteria);
    if (!cleaned) return [];
    const key = `${cleaned.name.toLocaleLowerCase("de")}|${cleaned.city.toLocaleLowerCase("de")}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [cleaned];
  }).slice(0, 10);
}
