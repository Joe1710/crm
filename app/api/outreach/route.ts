import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies } from "../../../db/schema";
import { draftOutreachEmail } from "../../../lib/outreach-email";
import { getSessionUser } from "../../../lib/session-auth";

/** Liefert Betreff und Text der nächsten (festen) Aussendung für eine Firma. */
export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { companyId?: number; step?: number };
    if (!body.companyId) return Response.json({ message: "Unternehmen fehlt." }, { status: 400 });
    const [company] = await getDb().select().from(companies).where(eq(companies.id, Number(body.companyId))).limit(1);
    if (!company) return Response.json({ message: "Unternehmen wurde nicht gefunden." }, { status: 404 });
    const step = body.step ? Number(body.step) : Math.min(company.outreachStep + 1, 3);
    return Response.json(draftOutreachEmail(company, step));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "E-Mail konnte nicht geladen werden." }, { status: 500 });
  }
}
