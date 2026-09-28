import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies, users } from "../../../db/schema";
import { draftOutreachEmail, OutreachApiError } from "../../../lib/outreach-email";
import { getSessionUser } from "../../../lib/session-auth";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  try {
    const body = await request.json() as { companyId?: number };
    if (!body.companyId) return Response.json({ message: "Unternehmen fehlt." }, { status: 400 });

    const db = getDb();
    const [company] = await db.select().from(companies).where(eq(companies.id, Number(body.companyId))).limit(1);
    if (!company) return Response.json({ message: "Unternehmen wurde nicht gefunden." }, { status: 404 });

    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);

    const draft = draftOutreachEmail(
      {
        name: company.name,
        city: company.city,
        industry: company.industry,
        manager: company.manager,
        distance: company.distance,
        notes: company.notes
      },
      {
        senderName: sessionUser.name,
        bio: user?.bio ?? "",
        styleSamples: []
      }
    );

    return Response.json(draft);
  } catch (error) {
    const status = error instanceof OutreachApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "E-Mail-Entwurf konnte nicht erstellt werden." }, { status });
  }
}
