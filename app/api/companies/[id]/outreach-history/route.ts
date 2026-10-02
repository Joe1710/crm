import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { outreachEmails } from "../../../../../db/schema";
import { getSessionUser } from "../../../../../lib/session-auth";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await context.params;
  const history = await getDb().select().from(outreachEmails).where(eq(outreachEmails.companyId, Number(id))).orderBy(desc(outreachEmails.sentAt));
  return Response.json({ history });
}
