import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { eventSignups } from "../../../db/schema";
import { getSessionUser } from "../../../lib/session-auth";

/** Verbindliche Anmeldungen über die Veranstaltungsseite. */
export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const signups = await getDb().select().from(eventSignups).orderBy(desc(eventSignups.createdAt));
  return Response.json({ signups });
}
