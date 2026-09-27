import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { sessions } from "../../../../db/schema";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await getDb().delete(sessions).where(eq(sessions.token, token));
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
  return Response.redirect(`${new URL(request.url).origin}/login`, 303);
}
