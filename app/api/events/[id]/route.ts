import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { events } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/session-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const update: Partial<typeof events.$inferInsert> = { updatedAt: new Date().toISOString(), notionSyncedAt: null };
    if (body.title !== undefined) update.title = String(body.title);
    if (body.location !== undefined) update.location = String(body.location);
    if (body.address !== undefined) update.address = String(body.address);
    if (body.startAt !== undefined) update.startAt = String(body.startAt);
    if (body.endAt !== undefined) update.endAt = String(body.endAt);
    if (body.capacity !== undefined) update.capacity = Number(body.capacity);
    if (body.status !== undefined) update.status = String(body.status);
    if (body.notes !== undefined) update.notes = String(body.notes);

    const [event] = await getDb().update(events).set(update).where(eq(events.id, Number(id))).returning();
    return Response.json({ event });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
