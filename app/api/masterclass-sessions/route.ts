import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { masterclassSessions } from "../../../db/schema";
import { getSessionUser } from "../../../lib/session-auth";

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const sessions = await getDb().select().from(masterclassSessions).orderBy(asc(masterclassSessions.date), asc(masterclassSessions.startTime));
  return Response.json({ sessions });
}
