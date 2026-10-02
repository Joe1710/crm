import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { inboxMessages, styleSamples, users } from "../../../../../db/schema";
import { draftInboxReply, InboxReplyApiError } from "../../../../../lib/inbox-reply";
import { getSessionUser } from "../../../../../lib/session-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });

  try {
    const { id } = await context.params;
    const db = getDb();
    const [message] = await db.select().from(inboxMessages).where(eq(inboxMessages.id, Number(id))).limit(1);
    if (!message) return Response.json({ message: "Nachricht wurde nicht gefunden." }, { status: 404 });

    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
    const samples = await db.select().from(styleSamples).where(eq(styleSamples.userId, sessionUser.id));

    const draft = await draftInboxReply(
      { fromName: message.fromName, fromAddress: message.fromAddress, subject: message.subject, bodyText: message.bodyText },
      { senderName: sessionUser.name, bio: user?.bio ?? "", styleSamples: samples.map(s => s.content) }
    );

    await db.update(inboxMessages).set({ replyDraft: draft.body }).where(eq(inboxMessages.id, message.id));

    return Response.json(draft);
  } catch (error) {
    const status = error instanceof InboxReplyApiError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Antwortvorschlag konnte nicht erstellt werden." }, { status });
  }
}
