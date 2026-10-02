import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { inboxMessages } from "../../../db/schema";
import { getSessionUser } from "../../../lib/session-auth";

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    return Response.json({ messages: await getDb().select().from(inboxMessages).orderBy(desc(inboxMessages.receivedAt)) });
  } catch {
    return Response.json({ messages: [] });
  }
}
