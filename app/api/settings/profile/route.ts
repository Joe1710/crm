import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { styleSamples, users } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/session-auth";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  const origin = new URL(request.url).origin;
  if (!sessionUser) return Response.redirect(`${origin}/login`, 303);

  const form = await request.formData();
  const bio = String(form.get("bio") ?? "").trim();
  const styleInputs = [form.get("style_1"), form.get("style_2"), form.get("style_3")]
    .map(value => String(value ?? "").trim())
    .filter(Boolean);

  const db = getDb();
  await db.update(users).set({ bio }).where(eq(users.id, sessionUser.id));
  await db.delete(styleSamples).where(eq(styleSamples.userId, sessionUser.id));
  for (const content of styleInputs) {
    await db.insert(styleSamples).values({ userId: sessionUser.id, content });
  }

  return Response.redirect(`${origin}/settings?success=1`, 303);
}
