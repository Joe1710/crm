import Link from "next/link";
import { requireSessionUser } from "../../lib/session-auth";

export default async function ChangePasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireSessionUser("/change-password");
  const params = await searchParams;

  return (
    <div className="login-shell">
      <form className="add-modal login-card" method="POST" action="/api/auth/change-password">
        <p className="eyebrow">{user.name.toUpperCase()}</p>
        <h2>Passwort ändern</h2>
        {params.error === "current" && <p className="login-error">Aktuelles Passwort ist falsch.</p>}
        {params.error === "short" && <p className="login-error">Das neue Passwort muss mindestens 10 Zeichen lang sein.</p>}
        {params.success && <p className="login-success">Passwort wurde geändert.</p>}
        <div className="form-grid">
          <label className="span2">
            <span>Aktuelles Passwort</span>
            <input name="current_password" type="password" required autoFocus />
          </label>
          <label className="span2">
            <span>Neues Passwort (mind. 10 Zeichen)</span>
            <input name="new_password" type="password" minLength={10} required />
          </label>
        </div>
        <div className="form-actions">
          <Link href="/" className="secondary" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Zurück</Link>
          <button type="submit" className="primary">Speichern</button>
        </div>
      </form>
    </div>
  );
}
