import { env } from "cloudflare:workers";

export type OutreachCompany = {
  name: string;
  city: string;
  industry: string;
  manager: string;
  distance: number;
  notes: string;
};

export type OutreachProfile = {
  senderName: string;
  bio: string;
  styleSamples: string[];
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

const emailSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" }
  },
  required: ["subject", "body"],
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

export async function draftOutreachEmail(company: OutreachCompany, profile: OutreachProfile) {
  const { apiKey, model } = config();
  if (!apiKey) throw new OutreachApiError("Die E-Mail-Erstellung ist noch nicht aktiviert. Bitte OPENAI_API_KEY als geschützten Schlüssel hinterlegen.", 503);
  if (!profile.bio.trim()) throw new OutreachApiError("Bitte zuerst unter „Profil & Stil“ deinen persönlichen Hintergrund hinterlegen.", 400);

  const styleBlock = profile.styleSamples.length
    ? profile.styleSamples.map((sample, i) => `Beispiel ${i + 1}:\n${sample.trim()}`).join("\n\n")
    : "Keine Beispiele hinterlegt – schreibe in einem freundlichen, klaren, professionellen Ton.";

  const prompt = `Formuliere eine kurze deutsche Erstkontakt-E-Mail an ein Unternehmen für die Akquisition der KI Masterclass.

Name des Absenders: ${profile.senderName}

Persönlicher Hintergrund des Absenders (in eigenen Worten, so einfließen lassen, dass er sich glaubwürdig vorstellt und zum Kern kommt):
${profile.bio.trim()}

Schreibstil-Beispiele des Absenders (Ton, Wortwahl und Satzbau daran orientieren, nicht wörtlich kopieren):
${styleBlock}

Empfänger-Firma:
- Name: ${company.name}
- Ort: ${company.city}
- Branche: ${company.industry}
- Geschäftsführung: ${company.manager || "unbekannt, keine persönliche Anrede erfinden"}
- Entfernung von Nürnberg: ${company.distance} km
- Bisherige Notizen zum Kontakt: ${company.notes || "keine"}

Regeln:
- Kurz und konkret, keine Floskeln, kein Werbe-Ton.
- Persönliche Vorstellung zuerst (kurz), dann direkt zum eigentlichen Anliegen kommen.
- Erfinde keine Fakten über die Firma, die nicht oben angegeben sind.
- Anrede nur mit echtem Namen, falls Geschäftsführung bekannt ist, sonst neutral ("Guten Tag,").
- Grußformel am Ende mit dem echten Namen des Absenders unterschreiben, kein Platzhalter wie "[Ihr Name]".
- subject: kurzer, konkreter Betreff. body: vollständiger E-Mail-Text inklusive Anrede und Grußformel.`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: prompt,
        reasoning: { effort: "low" },
        max_output_tokens: 2000,
        store: false,
        text: { format: { type: "json_schema", name: "outreach_email", strict: true, schema: emailSchema } }
      }),
      signal: AbortSignal.timeout(120_000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new OutreachApiError("Die E-Mail-Erstellung hat das Zeitlimit überschritten. Bitte erneut versuchen.", 504);
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
  if (!text) throw new OutreachApiError("Die E-Mail-Erstellung hat keinen auswertbaren Text geliefert.", 502);

  try {
    const parsed = JSON.parse(text) as { subject?: string; body?: string };
    if (!parsed.subject || !parsed.body) throw new Error("missing fields");
    return { subject: parsed.subject, body: parsed.body };
  } catch {
    throw new OutreachApiError("Die E-Mail konnte nicht ausgewertet werden.", 502);
  }
}
