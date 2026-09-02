export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>;
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
        <input type="hidden" name="return_to" value={returnTo} />
        <div className="form-grid">
          <label className="span2">
            <span>E-Mail</span>
            <input name="email" type="email" required autoFocus />
          </label>
          <label className="span2">
            <span>Passwort</span>
            <input name="password" type="password" required />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary wide">Anmelden</button>
        </div>
      </form>
    </div>
  );
}
