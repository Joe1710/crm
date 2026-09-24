import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/session-auth";
import { hashPassword } from "../../../../lib/auth";

const USER_COLUMNS = { id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt };

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: Response.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  if (user.role !== "admin") return { error: Response.json({ error: "Nur für Administratoren" }, { status: 403 }) } as const;
  return { user } as const;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const list = await getDb().select(USER_COLUMNS).from(users).orderBy(asc(users.name));
  return Response.json({ users: list });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "user";

    if (!name) return Response.json({ error: "Name fehlt" }, { status: 400 });
    if (!email.includes("@")) return Response.json({ error: "E-Mail-Adresse ist ungültig" }, { status: 400 });
    if (password.length < 10) return Response.json({ error: "Das Passwort muss mindestens 10 Zeichen lang sein" }, { status: 400 });

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return Response.json({ error: "Diese E-Mail-Adresse ist bereits vergeben" }, { status: 409 });

    const { salt, hash } = await hashPassword(password);
    const [user] = await db.insert(users).values({ name, email, passwordSalt: salt, passwordHash: hash, role }).returning(USER_COLUMNS);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Anlegen fehlgeschlagen" }, { status: 500 });
  }
}
