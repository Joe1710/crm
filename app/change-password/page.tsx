import Link from "next/link";
import { PasswordField } from "../components/PasswordField";
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
          <PasswordField name="current_password" label="Aktuelles Passwort" autoFocus />
          <PasswordField name="new_password" label="Neues Passwort (mind. 10 Zeichen)" minLength={10} />
        </div>
        <div className="form-actions">
          <Link href="/" className="secondary" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Zurück</Link>
          <button type="submit" className="primary">Speichern</button>
        </div>
      </form>
    </div>
  );
}
