import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { hashPassword } from "../../../../lib/auth";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const newPassword = String(form.get("new_password") ?? "");

  const db = getDb();
  const [user] = token ? await db.select().from(users).where(eq(users.resetToken, token)).limit(1) : [];
  const valid = Boolean(user && user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) > new Date());

  if (!valid) {
    return Response.redirect(`${origin}/reset-password?token=${encodeURIComponent(token)}`, 303);
  }
  if (newPassword.length < 10) {
    return Response.redirect(`${origin}/reset-password?token=${encodeURIComponent(token)}&error=short`, 303);
  }

  const { salt, hash } = await hashPassword(newPassword);
  await db.update(users).set({ passwordSalt: salt, passwordHash: hash, resetToken: null, resetTokenExpiresAt: null }).where(eq(users.id, user!.id));

  return Response.redirect(`${origin}/login?reset=1`, 303);
}
