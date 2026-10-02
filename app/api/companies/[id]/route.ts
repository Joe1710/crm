import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { activities, companies } from "../../../../db/schema";
import { isStage } from "../../../../lib/crm-stages";
import { isValidOriginCity } from "../../../../lib/german-cities";
import { getSessionUser } from "../../../../lib/session-auth";

type PatchBody = { stage?: string; salutation?: string; notes?: string; originCity?: string };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json() as PatchBody;
    const db = getDb();
    const [current] = await db.select().from(companies).where(eq(companies.id, Number(id))).limit(1);
    if (!current) return Response.json({ error: "Unternehmen nicht gefunden" }, { status: 404 });

    const now = new Date().toISOString();
    const update: Partial<typeof companies.$inferInsert> = { updatedAt: now, notionSyncedAt: null };
    if (body.stage !== undefined) {
      if (!isStage(body.stage)) return Response.json({ error: "Unbekannte Stufe" }, { status: 400 });
      if (body.stage !== current.stage) { update.stage = body.stage; update.stageChangedAt = now; }
      if (body.stage === "Zugesagt" || body.stage === "Verloren") update.awaitingReply = 0;
    }
    if (body.salutation !== undefined) update.salutation = body.salutation.trim();
    if (body.notes !== undefined) update.notes = body.notes;
    if (body.originCity !== undefined && isValidOriginCity(body.originCity)) update.originCity = body.originCity;
    if (Object.keys(update).length <= 2) return Response.json({ error: "Keine Änderung übergeben" }, { status: 400 });

    const [company] = await db.update(companies).set(update).where(eq(companies.id, Number(id))).returning();
    if (update.stage) {
      await db.insert(activities).values({ companyId: company.id, kind: "Status", result: "", note: `Status: ${current.stage} → ${update.stage}`, createdBy: user.name, createdAt: now });
    }
    return Response.json({ company });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen" }, { status: 500 }); }
}
