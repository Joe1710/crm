import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { inboxMessages } from "../../../../../db/schema";
import { getSessionUser } from "../../../../../lib/session-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  const runtime = env as unknown as { N8N_SEND_WEBHOOK_URL?: string; N8N_SEND_WEBHOOK_SECRET?: string };
  const webhookUrl = runtime.N8N_SEND_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return Response.json({ message: "Der Versand ist noch nicht eingerichtet. Bitte N8N_SEND_WEBHOOK_URL als geschützten Schlüssel hinterlegen." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json() as { subject?: string; body?: string };
    if (!body.body?.trim()) return Response.json({ message: "Antworttext fehlt." }, { status: 400 });

    const db = getDb();
    const [message] = await db.select().from(inboxMessages).where(eq(inboxMessages.id, Number(id))).limit(1);
    if (!message) return Response.json({ message: "Nachricht wurde nicht gefunden." }, { status: 404 });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runtime.N8N_SEND_WEBHOOK_SECRET ? { "X-Send-Secret": runtime.N8N_SEND_WEBHOOK_SECRET } : {})
      },
      body: JSON.stringify({ to: message.fromAddress, subject: body.subject || message.subject, body: body.body }),
      signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
      return Response.json({ message: `Versand über n8n fehlgeschlagen (${response.status}).` }, { status: 502 });
    }

    const sentAt = new Date().toISOString();
    await db.update(inboxMessages).set({ replyFinal: body.body, status: "Beantwortet", sentAt }).where(eq(inboxMessages.id, message.id));

    return Response.json({ status: "Beantwortet", sentAt });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Versand fehlgeschlagen." }, { status: 500 });
  }
}
