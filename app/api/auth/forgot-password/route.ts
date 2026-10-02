import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { createSessionToken } from "../../../../lib/auth";
import { readSmtpConfig, sendSmtpMail } from "../../../../lib/smtp";

const RESET_DURATION_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  const db = getDb();
  const [user] = email ? await db.select().from(users).where(eq(users.email, email)).limit(1) : [];

  if (user) {
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + RESET_DURATION_MS).toISOString();
    await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(users.id, user.id));

    const runtime = env as unknown as Record<string, string | undefined>;
    const smtpConfig = readSmtpConfig(runtime);
    if (smtpConfig) {
      const resetUrl = `${origin}/reset-password?token=${token}`;
      const body = [
        `Guten Tag ${user.name},`,
        ``,
        `für dein CRM-Konto wurde ein neues Passwort angefordert.`,
        ``,
        `Neues Passwort festlegen: ${resetUrl}`,
        ``,
        `Der Link ist eine Stunde gültig. Falls du das nicht warst, kannst du diese E-Mail ignorieren.`
      ].join("\n");
      await sendSmtpMail(smtpConfig, { to: user.email, subject: "Passwort zurücksetzen – KI Masterclass CRM", body }).catch(() => {});
    }
  }

  return Response.redirect(`${origin}/forgot-password?sent=1`, 303);
}
