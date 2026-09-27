import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { hashPassword, verifyPassword } from "../../../../lib/auth";
import { getSessionUser } from "../../../../lib/session-auth";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  const origin = new URL(request.url).origin;
  if (!sessionUser) return Response.redirect(`${origin}/login`, 303);

  const form = await request.formData();
  const currentPassword = String(form.get("current_password") ?? "");
  const newPassword = String(form.get("new_password") ?? "");

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  const valid = user ? await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash) : false;

  if (!valid) {
    return Response.redirect(`${origin}/change-password?error=current`, 303);
  }
  if (newPassword.length < 10) {
    return Response.redirect(`${origin}/change-password?error=short`, 303);
  }

  const { salt, hash } = await hashPassword(newPassword);
  await db.update(users).set({ passwordSalt: salt, passwordHash: hash }).where(eq(users.id, sessionUser.id));

  return Response.redirect(`${origin}/change-password?success=1`, 303);
}
