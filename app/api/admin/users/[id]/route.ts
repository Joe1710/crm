import { and, eq, ne } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { sessions, users } from "../../../../../db/schema";
import { getSessionUser } from "../../../../../lib/session-auth";
import { hashPassword } from "../../../../../lib/auth";

const USER_COLUMNS = { id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt };

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: Response.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  if (user.role !== "admin") return { error: Response.json({ error: "Nur für Administratoren" }, { status: 403 }) } as const;
  return { user } as const;
}

async function countOtherAdmins(db: ReturnType<typeof getDb>, excludeId: number) {
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), ne(users.id, excludeId)));
  return admins.length;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await context.params;
    const targetId = Number(id);
    const body = await request.json() as Record<string, unknown>;
    const db = getDb();

    const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) return Response.json({ error: "Zugang nicht gefunden" }, { status: 404 });

    const changes: Record<string, string> = {};

    if (typeof body.name === "string" && body.name.trim()) changes.name = body.name.trim();

    if (typeof body.email === "string" && body.email.trim()) {
      const email = body.email.trim().toLowerCase();
      if (!email.includes("@")) return Response.json({ error: "E-Mail-Adresse ist ungültig" }, { status: 400 });
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing && existing.id !== targetId) return Response.json({ error: "Diese E-Mail-Adresse ist bereits vergeben" }, { status: 409 });
      changes.email = email;
    }

    if (typeof body.role === "string" && (body.role === "admin" || body.role === "user")) {
      if (target.role === "admin" && body.role === "user" && targetId === guard.user.id) {
        return Response.json({ error: "Du kannst dir die eigene Admin-Rolle nicht selbst entziehen" }, { status: 400 });
      }
      if (target.role === "admin" && body.role === "user" && (await countOtherAdmins(db, targetId)) === 0) {
        return Response.json({ error: "Es muss mindestens ein Administrator bestehen bleiben" }, { status: 400 });
      }
      changes.role = body.role;
    }

    if (typeof body.password === "string" && body.password) {
      if (body.password.length < 10) return Response.json({ error: "Das Passwort muss mindestens 10 Zeichen lang sein" }, { status: 400 });
      const { salt, hash } = await hashPassword(body.password);
      changes.passwordSalt = salt;
      changes.passwordHash = hash;
      // Ein neu vergebenes Passwort macht bestehende Sitzungen ungültig, damit ein verlorener/kompromittierter Zugang sofort greift.
      await db.delete(sessions).where(eq(sessions.userId, targetId));
    }

    if (Object.keys(changes).length === 0) return Response.json({ error: "Keine Änderung angegeben" }, { status: 400 });

    const [user] = await db.update(users).set(changes).where(eq(users.id, targetId)).returning(USER_COLUMNS);
    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id } = await context.params;
    const targetId = Number(id);
    if (targetId === guard.user.id) return Response.json({ error: "Du kannst deinen eigenen Zugang nicht löschen" }, { status: 400 });

    const db = getDb();
    const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) return Response.json({ error: "Zugang nicht gefunden" }, { status: 404 });
    if (target.role === "admin" && (await countOtherAdmins(db, targetId)) === 0) {
      return Response.json({ error: "Es muss mindestens ein Administrator bestehen bleiben" }, { status: 400 });
    }

    await db.delete(sessions).where(eq(sessions.userId, targetId));
    await db.delete(users).where(eq(users.id, targetId));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Löschen fehlgeschlagen" }, { status: 500 });
  }
}
