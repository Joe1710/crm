import Link from "next/link";
import { PasswordField } from "../components/PasswordField";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; return_to?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const returnTo = params.return_to && params.return_to.startsWith("/") && !params.return_to.startsWith("//")
    ? params.return_to
    : "/";

  return (
    <div className="login-shell">
      <form className="add-modal login-card" method="POST" action="/api/auth/login">
        <p className="eyebrow">KI MASTERCLASS · REGION NÜRNBERG</p>
        <h2>Anmelden</h2>
        {params.error && <p className="login-error">E-Mail oder Passwort ist falsch.</p>}
        {params.reset && <p className="login-success">Passwort wurde gesetzt. Du kannst dich jetzt anmelden.</p>}
        <input type="hidden" name="return_to" value={returnTo} />
        <div className="form-grid">
          <label className="span2">
            <span>E-Mail</span>
            <input name="email" type="email" required autoFocus />
          </label>
          <PasswordField name="password" label="Passwort" />
        </div>
        <div className="form-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/forgot-password" className="secondary" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Passwort vergessen?</Link>
          <button type="submit" className="primary">Anmelden</button>
        </div>
      </form>
    </div>
  );
}
