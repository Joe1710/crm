import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies } from "../../../../db/schema";
import { draftConfirmationEmail } from "../../../../lib/outreach-email";
import { getSessionUser } from "../../../../lib/session-auth";
import { sendConfirmationEmail, SendOutreachError } from "../../../../lib/send-outreach";

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { companyId?: number };
    if (!body.companyId) return Response.json({ message: "Unternehmen fehlt." }, { status: 400 });
    const [company] = await getDb().select().from(companies).where(eq(companies.id, Number(body.companyId))).limit(1);
    if (!company) return Response.json({ message: "Unternehmen wurde nicht gefunden." }, { status: 404 });
    return Response.json(draftConfirmationEmail(company));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "E-Mail-Entwurf konnte nicht erstellt werden." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { companyId?: number; subject?: string; body?: string };
    if (!body.companyId) return Response.json({ message: "Unternehmen fehlt." }, { status: 400 });
    if (!body.subject?.trim() || !body.body?.trim()) return Response.json({ message: "Betreff oder Text fehlt." }, { status: 400 });
    const result = await sendConfirmationEmail({ companyId: Number(body.companyId), subject: body.subject, body: body.body });
    return Response.json(result);
  } catch (error) {
    const status = error instanceof SendOutreachError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Versand fehlgeschlagen." }, { status });
  }
}
