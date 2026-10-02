import Link from "next/link";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="login-shell">
      <form className="add-modal login-card" method="POST" action="/api/auth/forgot-password">
        <p className="eyebrow">KI MASTERCLASS · REGION NÜRNBERG</p>
        <h2>Passwort vergessen</h2>
        {params.sent
          ? <p className="login-success">Falls diese E-Mail-Adresse bei uns registriert ist, haben wir einen Link zum Zurücksetzen verschickt. Bitte prüfe dein Postfach.</p>
          : <>
              <div className="form-grid">
                <label className="span2">
                  <span>E-Mail</span>
                  <input name="email" type="email" required autoFocus />
                </label>
              </div>
              <div className="form-actions">
                <Link href="/login" className="secondary" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Zurück zur Anmeldung</Link>
                <button type="submit" className="primary">Link zusenden</button>
              </div>
            </>}
      </form>
    </div>
  );
}
