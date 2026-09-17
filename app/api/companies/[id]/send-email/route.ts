import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { companies } from "../../../../../db/schema";
import { MailerApiError, mailerConfigured, sendMail } from "../../../../../lib/mailer";
import { getSessionUser } from "../../../../../lib/session-auth";

type SendEmailBody = { emailNumber?: number; subject?: string; body?: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!mailerConfigured()) return Response.json({ message: "Der E-Mail-Versand ist noch nicht eingerichtet. Bitte SMTP-Zugangsdaten hinterlegen." }, { status: 503 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as SendEmailBody;
  const emailNumber = Number(body.emailNumber);
  const subject = String(body.subject ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (emailNumber !== 1 && emailNumber !== 2) return Response.json({ message: "Ungültige E-Mail-Nummer." }, { status: 400 });
  if (!subject || !text) return Response.json({ message: "Betreff und Text dürfen nicht leer sein." }, { status: 400 });

  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, Number(id))).limit(1);
  if (!company) return Response.json({ message: "Unternehmen wurde nicht gefunden." }, { status: 404 });
  if (!company.email) return Response.json({ message: "Für dieses Unternehmen ist keine E-Mail-Adresse hinterlegt." }, { status: 400 });

  try {
    await sendMail({ to: company.email, subject, text });
  } catch (error) {
    const status = error instanceof MailerApiError ? error.status : 502;
    return Response.json({ message: error instanceof Error ? error.message : "Mailversand fehlgeschlagen." }, { status });
  }

  const now = new Date().toISOString();
  const changes = emailNumber === 1
    ? { email1Subject: subject, email1Body: text, email1SentAt: now }
    : { email2Subject: subject, email2Body: text, email2SentAt: now };
  const [updated] = await db.update(companies).set({ ...changes, updatedAt: now, notionSyncedAt: null }).where(eq(companies.id, company.id)).returning();
  return Response.json({ company: updated });
}
