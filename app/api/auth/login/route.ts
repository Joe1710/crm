import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { sessions, users } from "../../../../db/schema";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_MS, verifyPassword } from "../../../../lib/auth";

function safeReturnTo(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const returnTo = safeReturnTo(form.get("return_to"));

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  const valid = user ? await verifyPassword(password, user.passwordSalt, user.passwordHash) : false;
  if (!user || !valid) {
    const failurePath = `/login?error=1&return_to=${encodeURIComponent(returnTo)}`;
    return Response.redirect(`${origin}${failurePath}`, 303);
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await db.insert(sessions).values({ token, userId: user.id, expiresAt });

  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    expires: new Date(expiresAt)
  });

  return Response.redirect(`${origin}${returnTo || "/"}`, 303);
}
