import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { inboxMessages } from "../../../../db/schema";

type IncomingPayload = {
  fromAddress?: string;
  fromName?: string;
  subject?: string;
  receivedAt?: string;
  bodyText?: string;
  attachmentsDriveUrl?: string;
  textPdfDriveUrl?: string;
};

export async function POST(request: Request) {
  const runtime = env as unknown as { INBOX_WEBHOOK_SECRET?: string };
  const expected = runtime.INBOX_WEBHOOK_SECRET?.trim();
  const provided = request.headers.get("x-inbox-secret")?.trim();
  if (!expected || !provided || provided !== expected) {
    return Response.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json() as IncomingPayload;
    if (!body.fromAddress) return Response.json({ error: "fromAddress fehlt" }, { status: 400 });

    const db = getDb();
    const [message] = await db.insert(inboxMessages).values({
      fromAddress: body.fromAddress.trim(),
      fromName: (body.fromName || "").trim(),
      subject: (body.subject || "").trim(),
      receivedAt: body.receivedAt || new Date().toISOString(),
      bodyText: (body.bodyText || "").trim(),
      attachmentsDriveUrl: body.attachmentsDriveUrl || null,
      textPdfDriveUrl: body.textPdfDriveUrl || null,
      status: "Neu"
    }).returning();

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
