"use client";

import { FormEvent, useState } from "react";

type ManagedUser = { id: number; name: string; email: string; role: string; createdAt: string };
type SessionUser = { id: number; name: string; email: string; role: string };

function initials(name: string) { return name.split(" ").slice(0, 2).map(x => x[0]).join(""); }
function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (response.status === 401) { window.location.href = "/login"; throw new Error("Nicht angemeldet"); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Anfrage fehlgeschlagen");
  return body;
}

export default function UsersAdmin({ sessionUser, initialUsers }: { sessionUser: SessionUser; initialUsers: ManagedUser[] }) {
  const [list, setList] = useState<ManagedUser[]>(initialUsers);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function flash(message: string) { setNotice(message); setTimeout(() => setNotice(""), 3200); }
  function flashError(message: string) { setError(message); setTimeout(() => setError(""), 5000); }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const form = new FormData(event.currentTarget);
      const { user } = await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") })
      });
      setList(old => [...old, user].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      flash(`Zugang für ${user.name} wurde angelegt`);
    } catch (err) { flashError(err instanceof Error ? err.message : "Anlegen fehlgeschlagen"); }
    finally { setCreating(false); }
  }

  async function updateRole(target: ManagedUser, role: string) {
    setBusyId(target.id);
    try {
      const { user } = await api(`/api/admin/users/${target.id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setList(old => old.map(u => (u.id === user.id ? user : u)));
      flash(`Rolle von ${user.name} auf „${role === "admin" ? "Administrator" : "Mitarbeiter"}“ gesetzt`);
    } catch (err) { flashError(err instanceof Error ? err.message : "Rolle konnte nicht geändert werden"); }
    finally { setBusyId(null); }
  }

  async function savePassword(target: ManagedUser) {
    if (resetValue.length < 10) { flashError("Das Passwort muss mindestens 10 Zeichen lang sein"); return; }
    setBusyId(target.id);
    try {
      await api(`/api/admin/users/${target.id}`, { method: "PATCH", body: JSON.stringify({ password: resetValue }) });
      setResetId(null); setResetValue("");
      flash(`Neues Passwort für ${target.name} gesetzt – bestehende Anmeldungen wurden abgemeldet`);
    } catch (err) { flashError(err instanceof Error ? err.message : "Passwort konnte nicht gesetzt werden"); }
    finally { setBusyId(null); }
  }

  async function deleteUser(target: ManagedUser) {
    setBusyId(target.id);
    try {
      await api(`/api/admin/users/${target.id}`, { method: "DELETE" });
      setList(old => old.filter(u => u.id !== target.id));
      setConfirmDeleteId(null);
      flash(`Zugang von ${target.name} wurde entfernt`);
    } catch (err) { flashError(err instanceof Error ? err.message : "Löschen fehlgeschlagen"); }
    finally { setBusyId(null); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">KI</span><div><strong>MASTERCLASS</strong><small>BENUTZERVERWALTUNG</small></div></div>
      <nav aria-label="Hauptnavigation">
        <a href="/" style={{ textDecoration: "none" }}><button type="button">← Zurück zum CRM</button></a>
      </nav>
      <div className="user" style={{ marginTop: "auto" }}><span>{initials(sessionUser.name)}</span><div><strong>{sessionUser.name}</strong><small><a href="/change-password" className="user-link">Passwort ändern</a></small></div><form className="logout-form" method="POST" action="/api/auth/logout"><button type="submit" title="Abmelden">⏻</button></form></div>
    </aside>

    <main>
      <header className="topbar"><div><span className="live-dot" /> Zugänge verwalten</div></header>
      <section className="content">
        <div className="page-head">
          <div><p className="eyebrow">ADMINISTRATION</p><h1>Benutzerverwaltung</h1><p>Wer Zugang zum CRM hat, wird hier direkt mit E-Mail-Adresse und Passwort festgelegt – keine externen Skripte mehr nötig.</p></div>
          <button className="primary" onClick={() => setShowAdd(true)}>＋ Neuen Zugang anlegen</button>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Angelegt</th><th></th></tr></thead>
            <tbody>
              {list.map(u => <tr key={u.id} style={{ cursor: "default" }}>
                <td><div className="company-cell"><span>{initials(u.name)}</span><div><strong>{u.name}</strong>{u.id === sessionUser.id && <small>Das bist du</small>}</div></div></td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} disabled={busyId === u.id || u.id === sessionUser.id} onChange={e => updateRole(u, e.target.value)}>
                    <option value="user">Mitarbeiter</option>
                    <option value="admin">Administrator</option>
                  </select>
                </td>
                <td>{fmtDate(u.createdAt)}</td>
                <td onClick={e => e.stopPropagation()}>
                  {resetId === u.id ? (
                    <div className="confirm-inline">
                      <input type="password" placeholder="Neues Passwort (min. 10 Zeichen)" value={resetValue} onChange={e => setResetValue(e.target.value)} autoFocus />
                      <button className="primary" disabled={busyId === u.id} onClick={() => savePassword(u)}>Speichern</button>
                      <button className="secondary" onClick={() => { setResetId(null); setResetValue(""); }}>Abbrechen</button>
                    </div>
                  ) : confirmDeleteId === u.id ? (
                    <div className="confirm-inline">
                      <span>Zugang wirklich entfernen?</span>
                      <button className="primary" disabled={busyId === u.id} onClick={() => deleteUser(u)}>Ja, entfernen</button>
                      <button className="secondary" onClick={() => setConfirmDeleteId(null)}>Abbrechen</button>
                    </div>
                  ) : (
                    <div className="outreach-actions">
                      <button className="secondary" onClick={() => { setResetId(u.id); setResetValue(""); }}>Passwort setzen</button>
                      {u.id !== sessionUser.id && <button className="secondary" onClick={() => setConfirmDeleteId(u.id)}>Entfernen</button>}
                    </div>
                  )}
                </td>
              </tr>)}
            </tbody>
          </table>
          {list.length === 0 && <div className="empty-table">Noch keine Zugänge angelegt.</div>}
        </div>
      </section>
    </main>

    {showAdd && <div className="modal-backdrop centered" onMouseDown={() => setShowAdd(false)}>
      <form className="add-modal" onSubmit={createUser} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="close" onClick={() => setShowAdd(false)}>×</button>
        <p className="eyebrow">NEUER ZUGANG</p>
        <h2>Zugang anlegen</h2>
        <div className="form-grid">
          <label className="span2"><span>Name *</span><input name="name" required autoFocus /></label>
          <label className="span2"><span>E-Mail *</span><input name="email" type="email" required /></label>
          <label className="span2"><span>Passwort * (mind. 10 Zeichen)</span><input name="password" type="password" minLength={10} required /></label>
          <label><span>Rolle</span><select name="role" defaultValue="user"><option value="user">Mitarbeiter</option><option value="admin">Administrator</option></select></label>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => setShowAdd(false)}>Abbrechen</button>
          <button className="primary" disabled={creating}>{creating ? "Wird angelegt …" : "Zugang anlegen"}</button>
        </div>
      </form>
    </div>}

    {notice && <div className="toast">✓ {notice}</div>}
  </div>;
}
