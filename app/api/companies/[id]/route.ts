import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/session-auth";

type PatchBody = {
  stage?: string;
  email1Subject?: string;
  email1Body?: string;
  email2Subject?: string;
  email2Body?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const { id } = await context.params; const body = await request.json() as PatchBody;
    const changes: Record<string, string> = {};
    if (typeof body.stage === "string") changes.stage = body.stage;
    if (typeof body.email1Subject === "string") changes.email1Subject = body.email1Subject;
    if (typeof body.email1Body === "string") changes.email1Body = body.email1Body;
    if (typeof body.email2Subject === "string") changes.email2Subject = body.email2Subject;
    if (typeof body.email2Body === "string") changes.email2Body = body.email2Body;
    if (Object.keys(changes).length === 0) return Response.json({ error: "Keine Änderung angegeben" }, { status: 400 });
    const [company] = await getDb().update(companies).set({ ...changes, updatedAt: new Date().toISOString(), notionSyncedAt: null }).where(eq(companies.id, Number(id))).returning();
    return Response.json({ company });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen" }, { status: 500 }); }
}
