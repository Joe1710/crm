import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { styleSamples as styleSamplesTable, users } from "../../db/schema";
import { requireSessionUser } from "../../lib/session-auth";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const sessionUser = await requireSessionUser("/settings");
  const params = await searchParams;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  const samples = await db.select().from(styleSamplesTable).where(eq(styleSamplesTable.userId, sessionUser.id));

  const sample = (index: number) => samples[index]?.content ?? "";

  return (
    <div className="login-shell">
      <form className="add-modal login-card settings-card" method="POST" action="/api/settings/profile">
        <p className="eyebrow">{sessionUser.name.toUpperCase()}</p>
        <h2>Profil &amp; Stil</h2>
        {params.success && <p className="login-success">Gespeichert.</p>}
        <div className="form-grid">
          <label className="span2">
            <span>Persönlicher Hintergrund (für die E-Mail-Vorstellung)</span>
            <textarea name="bio" rows={5} defaultValue={user?.bio ?? ""} placeholder="z. B. seit wann selbstständig, was du aufgebaut hast, deine Mission ..." />
          </label>
          <label className="span2">
            <span>Schreibstil-Beispiel 1</span>
            <textarea name="style_1" rows={4} defaultValue={sample(0)} placeholder="Füge eine E-Mail ein, die du selbst geschrieben hast" />
          </label>
          <label className="span2">
            <span>Schreibstil-Beispiel 2 (optional)</span>
            <textarea name="style_2" rows={4} defaultValue={sample(1)} />
          </label>
          <label className="span2">
            <span>Schreibstil-Beispiel 3 (optional)</span>
            <textarea name="style_3" rows={4} defaultValue={sample(2)} />
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
