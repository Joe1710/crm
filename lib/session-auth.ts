import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";
import { SESSION_COOKIE_NAME } from "./auth";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
};

const SIGN_IN_PATH = "/login";

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const [row] = await db
    .select({ userId: sessions.userId, expiresAt: sessions.expiresAt, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  return { id: row.userId, name: row.name, email: row.email };
}

export async function requireSessionUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}

export function signInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname === SIGN_IN_PATH) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}
