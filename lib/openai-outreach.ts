import { env } from "cloudflare:workers";

const SPEED_DATING_URL = "https://www.speed-date-ki-mittelstand.ki-masterclass.com";
const SPEED_DATING_DATE = "11.11.";

export type OutreachInput = {
  name: string;
  city: string;
  industry: string;
  website: string;
  manager: string;
  employees: string;
  ownerName: string;
};

export type OutreachResult = {
  highlight: string;
  highlightSourceUrl: string;
  email1Subject: string;
  email1Body: string;
  email2Subject: string;
  email2Body: string;
};

type OpenAIResponse = {
  error?: { message?: string };
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

type OpenAIRuntime = {
  OPENAI_API_KEY?: string;
  OPENAI_OUTREACH_MODEL?: string;
};

export class OutreachApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "OutreachApiError";
  }
}

const outreachSchema = {
  type: "object",
  properties: {
    highlight: { type: "string" },
    highlightSourceUrl: { type: "string" },
    email1Subject: { type: "string" },
    email1Body: { type: "string" },
    email2Subject: { type: "string" },
    email2Body: { type: "string" }
  },
  required: ["highlight", "highlightSourceUrl", "email1Subject", "email1Body", "email2Subject", "email2Body"],
  additionalProperties: false
};

function config() {
  const runtime = env as unknown as OpenAIRuntime;
  return {
    apiKey: runtime.OPENAI_API_KEY?.trim(),
    model: runtime.OPENAI_OUTREACH_MODEL?.trim() || "gpt-5.4-mini"
  };
}

export function outreachConfigured() {
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

export async function researchAndDraftOutreach(input: OutreachInput): Promise<OutreachResult> {
  const { apiKey, model } = config();
  if (!apiKey) throw new OutreachApiError("Die Recherche ist noch nicht aktiviert. Bitte OPENAI_API_KEY als geschützten Schlüssel hinterlegen.", 503);

  const prompt = `Du unterstützt die Vertriebs-Akquise der KI Masterclass. Für das folgende Unternehmen sollst du zuerst eine einzelne, konkrete Besonderheit recherchieren und dann darauf aufbauend zwei E-Mails entwerfen.

Unternehmen:
- Name: ${input.name}
- Ort: ${input.city}
- Branche: ${input.industry}
- Website: ${input.website || "unbekannt"}
- Geschäftsführung: ${input.manager || "unbekannt"}
- Mitarbeiterklasse: ${input.employees || "unbekannt"}

Schritt 1 – Besonderheit recherchieren:
- Suche nach aktuellen, öffentlich zugänglichen Quellen (Unternehmenswebsite/News-Bereich, Impressum, Presseartikel, LinkedIn) und finde EINE konkrete, belegbare Besonderheit dieses Unternehmens: z. B. eine aktuelle Entwicklung, ein Wachstumsschritt, eine Auszeichnung, eine Stellenausschreibung, eine Branchenherausforderung oder ein Digitalisierungsthema.
- Erfinde nichts. Wenn du keine belegbare Besonderheit findest, gib highlight und highlightSourceUrl als leere Zeichenfolge zurück statt zu spekulieren.
- highlightSourceUrl ist die eine URL, die die Besonderheit tatsächlich belegt.

Schritt 2 – Zwei E-Mails entwerfen (Deutsch, Sie-Anrede, professionell und warm, keine Marketing-Floskeln):
- E-Mail 1 (Einladung, ca. 150–200 Wörter): geht konkret auf die gefundene Besonderheit ein, erklärt kurz und spezifisch, warum das KI Masterclass Speed-Dating am ${SPEED_DATING_DATE} in Nürnberg gerade für dieses Unternehmen relevant ist, enthält den Link ${SPEED_DATING_URL} zur Anmeldung, endet mit einer freundlichen Grußformel unterschrieben mit "${input.ownerName}". Wenn keine Besonderheit gefunden wurde, geht die E-Mail stattdessen allgemein auf die Branche "${input.industry}" ein.
- E-Mail 2 (Nachfassen, ca. 60–80 Wörter): kurze, freundliche Erinnerung, verweist darauf dass bereits eine E-Mail versendet wurde, enthält denselben Link, unterschrieben mit "${input.ownerName}".
- email1Subject/email2Subject sind kurze, konkrete Betreffzeilen (keine Klickköder-Formulierungen).`;

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
        max_tool_calls: 6,
        max_output_tokens: 4000,
        store: false,
        text: { format: { type: "json_schema", name: "company_outreach", strict: true, schema: outreachSchema } }
      }),
      signal: AbortSignal.timeout(120_000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new OutreachApiError("Die Recherche hat das Zeitlimit überschritten. Bitte erneut versuchen.", 504);
    }
    throw new OutreachApiError("OpenAI ist momentan nicht erreichbar. Bitte später erneut versuchen.", 502);
  }

  let result: OpenAIResponse;
  try {
    result = await response.json() as OpenAIResponse;
  } catch {
    throw new OutreachApiError("OpenAI hat eine ungültige Antwort geliefert.", 502);
  }
  if (!response.ok) {
    const message = result.error?.message || `OpenAI-Fehler ${response.status}`;
    throw new OutreachApiError(message, response.status === 429 ? 429 : 502);
  }

  const text = outputText(result);
  if (!text) throw new OutreachApiError("Die Recherche hat kein auswertbares Ergebnis geliefert.", 502);

  let parsed: Partial<OutreachResult>;
  try {
    parsed = JSON.parse(text) as Partial<OutreachResult>;
  } catch {
    throw new OutreachApiError("Das Ergebnis konnte nicht ausgewertet werden.", 502);
  }

  const highlight = String(parsed.highlight || "").trim();
  const highlightSourceUrl = highlight ? validWebUrl(String(parsed.highlightSourceUrl || "")) : null;
  if (highlight && !highlightSourceUrl) {
    throw new OutreachApiError("Keine belegbare Besonderheit gefunden. Bitte später erneut versuchen oder manuell recherchieren.", 422);
  }

  const email1Subject = String(parsed.email1Subject || "").trim();
  const email1Body = String(parsed.email1Body || "").trim();
  const email2Subject = String(parsed.email2Subject || "").trim();
  const email2Body = String(parsed.email2Body || "").trim();
  if (!email1Subject || !email1Body || !email2Subject || !email2Body) {
    throw new OutreachApiError("Die E-Mail-Entwürfe konnten nicht vollständig erzeugt werden. Bitte erneut versuchen.", 502);
  }

  return { highlight, highlightSourceUrl: highlightSourceUrl || "", email1Subject, email1Body, email2Subject, email2Body };
}
