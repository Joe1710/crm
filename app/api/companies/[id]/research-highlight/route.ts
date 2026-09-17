import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { companies } from "../../../../../db/schema";
import { OutreachApiError, outreachConfigured, researchAndDraftOutreach } from "../../../../../lib/openai-outreach";
import { getSessionUser } from "../../../../../lib/session-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!outreachConfigured()) return Response.json({ message: "Die Recherche ist noch nicht aktiviert. Bitte OPENAI_API_KEY hinterlegen." }, { status: 503 });

  const { id } = await context.params;
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, Number(id))).limit(1);
  if (!company) return Response.json({ message: "Unternehmen wurde nicht gefunden." }, { status: 404 });

  try {
    const result = await researchAndDraftOutreach({
      name: company.name,
      city: company.city,
      industry: company.industry,
      website: company.website,
      manager: company.manager,
      employees: company.employees,
      ownerName: user.name.split(" ")[0]
    });
    const now = new Date().toISOString();
    const [updated] = await db.update(companies).set({
      highlight: result.highlight,
      highlightSourceUrl: result.highlightSourceUrl,
      highlightGeneratedAt: now,
      email1Subject: result.email1Subject,
      email1Body: result.email1Body,
      email1GeneratedAt: now,
      email2Subject: result.email2Subject,
      email2Body: result.email2Body,
      email2GeneratedAt: now,
      updatedAt: now,
      notionSyncedAt: null
    }).where(eq(companies.id, company.id)).returning();
    return Response.json({ company: updated });
  } catch (error) {
    const status = error instanceof OutreachApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Recherche konnte nicht abgeschlossen werden." }, { status });
  }
}
