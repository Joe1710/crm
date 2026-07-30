import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies } from "../../../../db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; const body = await request.json() as { stage?: string };
    if (!body.stage) return Response.json({ error: "Status fehlt" }, { status: 400 });
    const [company] = await getDb().update(companies).set({ stage: body.stage, updatedAt: new Date().toISOString(), notionSyncedAt: null }).where(eq(companies.id, Number(id))).returning();
    return Response.json({ company });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen" }, { status: 500 }); }
}
