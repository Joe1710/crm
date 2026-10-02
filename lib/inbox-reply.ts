import { env } from "cloudflare:workers";

export type IncomingMessage = {
  fromName: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
};

export type ReplyProfile = {
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

export class InboxReplyApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "InboxReplyApiError";
  }
}

const replySchema = {
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

function outputText(response: OpenAIResponse) {
  return (response.output || [])
    .filter(item => item.type === "message")
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text")
    .map(item => item.text || "")
    .join("");
}

export async function draftInboxReply(message: IncomingMessage, profile: ReplyProfile) {
  const { apiKey, model } = config();
  if (!apiKey) throw new InboxReplyApiError("Die E-Mail-Erstellung ist noch nicht aktiviert. Bitte OPENAI_API_KEY als geschützten Schlüssel hinterlegen.", 503);
  if (!profile.bio.trim()) throw new InboxReplyApiError("Bitte zuerst unter „Profil & Stil“ deinen persönlichen Hintergrund hinterlegen.", 400);

  const styleBlock = profile.styleSamples.length
    ? profile.styleSamples.map((sample, i) => `Beispiel ${i + 1}:\n${sample.trim()}`).join("\n\n")
    : "Keine Beispiele hinterlegt – schreibe in einem freundlichen, klaren, professionellen Ton.";

  const prompt = `Formuliere eine deutsche Antwort-E-Mail auf die untenstehende eingegangene Nachricht eines Interessenten der KI Masterclass.

Name des Absenders (der antwortet): ${profile.senderName}

Persönlicher Hintergrund des Absenders (nur zur Orientierung, nicht komplett wiederholen – bei einer Antwort geht es primär um das konkrete Anliegen des Interessenten):
${profile.bio.trim()}

Schreibstil-Beispiele des Absenders (Ton, Wortwahl und Satzbau daran orientieren):
${styleBlock}

Eingegangene Nachricht:
- Von: ${message.fromName || message.fromAddress} <${message.fromAddress}>
- Betreff: ${message.subject || "(kein Betreff)"}
- Text:
"""
${message.bodyText.trim()}
"""

Regeln:
- Gehe konkret auf das ein, was der Interessent geschrieben/gefragt hat. Keine generische Floskel-Antwort.
- Erfinde keine Fakten (z.B. keine erfundenen Termine, Preise oder Zusagen), die nicht aus der Nachricht oder dem Hintergrund hervorgehen.
- Anrede mit dem Namen des Absenders, falls bekannt, sonst neutral ("Guten Tag,").
- Grußformel am Ende mit dem echten Namen des Antwortenden unterschreiben, kein Platzhalter wie "[Ihr Name]".
- subject: passender Betreff (ggf. "Re: ..."). body: vollständiger Antworttext inklusive Anrede und Grußformel.`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: prompt,
        reasoning: { effort: "medium" },
        max_output_tokens: 2000,
        store: false,
        text: { format: { type: "json_schema", name: "inbox_reply", strict: true, schema: replySchema } }
      }),
      signal: AbortSignal.timeout(120_000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new InboxReplyApiError("Die Antwort-Erstellung hat das Zeitlimit überschritten. Bitte erneut versuchen.", 504);
    }
    throw new InboxReplyApiError("OpenAI ist momentan nicht erreichbar. Bitte später erneut versuchen.", 502);
  }

  let result: OpenAIResponse;
  try {
    result = await response.json() as OpenAIResponse;
  } catch {
    throw new InboxReplyApiError("OpenAI hat eine ungültige Antwort geliefert.", 502);
  }
  if (!response.ok) {
    const message2 = result.error?.message || `OpenAI-Fehler ${response.status}`;
    throw new InboxReplyApiError(message2, response.status === 429 ? 429 : 502);
  }

  const text = outputText(result);
  if (!text) throw new InboxReplyApiError("Die Antwort-Erstellung hat keinen auswertbaren Text geliefert.", 502);

  try {
    const parsed = JSON.parse(text) as { subject?: string; body?: string };
    if (!parsed.subject || !parsed.body) throw new Error("missing fields");
    return { subject: parsed.subject, body: parsed.body };
  } catch {
    throw new InboxReplyApiError("Die Antwort konnte nicht ausgewertet werden.", 502);
  }
}
