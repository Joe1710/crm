import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { activities, companies, eventSignups } from "../../../db/schema";
import { renderTemplateHtml, renderTemplateText, SIGNUP_CONFIRMATION } from "../../../lib/outreach-html";
import { readSmtpConfig, sendSmtpMail } from "../../../lib/smtp";

function page(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:Calibri,Arial,sans-serif;background:#0b2239;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
  .box{max-width:480px}
  h1{font-family:Georgia,serif;color:#e6c557;margin-bottom:16px}
  p{color:#c7d6e4;line-height:1.6;font-size:17px}
  a{color:#c9a227;font-weight:600;text-decoration:none}
</style>
</head>
<body>
  <div class="box">
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top:28px"><a href="https://ki-masterclass.com/ki-speed-date/">← Zurück zur Veranstaltungsseite</a></p>
  </div>
</body>
</html>`;
}

const html = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

/**
 * Anmeldung über https://ki-masterclass.com/ki-speed-date/ (Formular sendet hierher).
 * 1. Anmeldung wird IMMER zuerst gespeichert (zählt damit sofort im CRM).
 * 2. Passende Firma (gleiche E-Mail) wird auf „Zugesagt“ gesetzt und als verbindlich angemeldet markiert.
 * 3. Benachrichtigung an Jürgen + Bestätigung an die angemeldete Person.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  if (String(form.get("_honey") ?? "").trim()) {
    return html(page("Danke für Ihre Anmeldung!", "Wir melden uns vor der Veranstaltung bei Ihnen."));
  }

  const name = String(form.get("Name") ?? "").trim();
  const unternehmen = String(form.get("Unternehmen") ?? "").trim();
  const email = String(form.get("E-Mail") ?? "").trim();
  const personen = Math.max(1, Math.min(10, Number(String(form.get("Anzahl Personen") ?? "1").replace(/\D/g, "")) || 1));
  const nachricht = String(form.get("Thema / Nachricht") ?? "").trim();
  const einwilligung = String(form.get("Einwilligung Datenschutz") ?? "").trim();

  if (!name || !unternehmen || !email || !einwilligung) {
    return html(page("Angaben unvollständig", "Bitte gehen Sie zurück und füllen Sie alle Pflichtfelder aus."), 400);
  }

  const db = getDb();
  const now = new Date().toISOString();

  // 1) Speichern
  const [signup] = await db.insert(eventSignups).values({
    name, company: unternehmen, email, persons: personen, message: nachricht, consent: einwilligung, createdAt: now
  }).returning();

  // 2) Firma zuordnen (gleiche E-Mail-Adresse, sonst gleicher Firmenname)
  let matchedName = "";
  try {
    const lower = email.toLowerCase();
    let [company] = await db.select().from(companies).where(sql`lower(${companies.email}) = ${lower}`).limit(1);
    if (!company) [company] = await db.select().from(companies).where(sql`lower(${companies.name}) = ${unternehmen.toLowerCase()}`).limit(1);
    if (company) {
      matchedName = company.name;
      await db.update(companies).set({
        stage: "Zugesagt", ...(company.stage !== "Zugesagt" ? { stageChangedAt: now } : {}),
        registeredAt: now, awaitingReply: 0, lastResult: "positiv", lastActivityAt: now, updatedAt: now, notionSyncedAt: null
      }).where(eq(companies.id, company.id));
      await db.insert(activities).values({
        companyId: company.id, kind: "Anmeldung", result: "positiv",
        note: `Verbindlich über die Website angemeldet: ${name}, ${personen} Person(en)${nachricht ? ` – Thema: ${nachricht}` : ""}`,
        createdBy: "Website", createdAt: now
      });
      await db.update(eventSignups).set({ companyId: company.id }).where(eq(eventSignups.id, signup.id));
    }
  } catch { /* Zuordnung ist optional – die Anmeldung ist gespeichert */ }

  // 3) E-Mails
  const smtpConfig = readSmtpConfig(env as unknown as Record<string, string | undefined>);
  const status: string[] = [];
  if (smtpConfig) {
    const notice = [
      "Neue Anmeldung – Speed-Dating KI-Mittelstand (11.11.2026)", "",
      `Name: ${name}`, `Unternehmen: ${unternehmen}`, `E-Mail: ${email}`, `Anzahl Personen: ${personen}`,
      `Thema / Nachricht: ${nachricht || "–"}`, `Einwilligung Datenschutz: ${einwilligung}`,
      `Im CRM zugeordnet: ${matchedName || "keine passende Firma gefunden"}`, "", `Eingegangen: ${now}`
    ].join("\n");
    try { await sendSmtpMail(smtpConfig, { to: "jk@ki-masterclass.com", subject: `Neue Anmeldung Speed-Dating: ${name} (${unternehmen})`, body: notice }); status.push("Info an JK gesendet"); }
    catch (error) { status.push(`Info an JK fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`); }
    try {
      await sendSmtpMail(smtpConfig, {
        to: email, subject: SIGNUP_CONFIRMATION.subject,
        body: renderTemplateText(SIGNUP_CONFIRMATION, ""), html: renderTemplateHtml(SIGNUP_CONFIRMATION, "")
      });
      status.push("Bestätigung an Teilnehmer gesendet");
    } catch (error) { status.push(`Bestätigung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`); }
  } else {
    status.push("SMTP nicht eingerichtet");
  }
  await db.update(eventSignups).set({ mailStatus: status.join(" · ") }).where(eq(eventSignups.id, signup.id)).catch(() => undefined);

  return html(page("Vielen Dank für Ihre Anmeldung!", "Ihr Platz ist reserviert. Eine Bestätigung ist per E-Mail unterwegs – wir freuen uns auf Sie am 11. November."));
}
