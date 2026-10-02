import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { PasswordField } from "../components/PasswordField";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  const db = getDb();
  const [user] = token ? await db.select().from(users).where(eq(users.resetToken, token)).limit(1) : [];
  const valid = Boolean(user && user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) > new Date());

  if (!valid) {
    return (
      <div className="login-shell">
        <div className="add-modal login-card">
          <p className="eyebrow">KI MASTERCLASS · REGION NÜRNBERG</p>
          <h2>Link ungültig</h2>
          <p className="login-error">Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.</p>
          <div className="form-actions">
            <Link href="/forgot-password" className="primary" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Neuen Link anfordern</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <form className="add-modal login-card" method="POST" action="/api/auth/reset-password">
        <p className="eyebrow">KI MASTERCLASS · REGION NÜRNBERG</p>
        <h2>Neues Passwort festlegen</h2>
        {params.error === "short" && <p className="login-error">Das neue Passwort muss mindestens 10 Zeichen lang sein.</p>}
        <input type="hidden" name="token" value={token} />
        <div className="form-grid">
          <PasswordField name="new_password" label="Neues Passwort (mind. 10 Zeichen)" minLength={10} autoFocus />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary wide">Passwort setzen</button>
        </div>
      </form>
    </div>
  );
}
