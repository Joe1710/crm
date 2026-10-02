import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { companies, outreachEmails } from "../db/schema";
import { stageAfterEmail } from "./crm-stages";
import { outreachSubject, renderOutreachHtml, renderOutreachText, renderPlainHtml } from "./outreach-html";
import { readSmtpConfig, sendSmtpMail } from "./smtp";

export class SendOutreachError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "SendOutreachError";
  }
}

function resolveRecipient(companyEmail: string): { to: string; testNote: string | undefined } {
  const runtime = env as unknown as { OUTREACH_TEST_MODE?: string; OUTREACH_TEST_RECIPIENTS?: string };
  const testMode = runtime.OUTREACH_TEST_MODE?.trim().toLowerCase() === "true";
  if (!testMode) return { to: companyEmail, testNote: undefined };

  const recipients = (runtime.OUTREACH_TEST_RECIPIENTS ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const to = recipients[0] ?? companyEmail;
  return { to, testNote: `TESTMODUS – eigentlicher Empfänger wäre: ${companyEmail}` };
}

async function loadCompany(companyId: number) {
  const smtpConfig = readSmtpConfig(env as unknown as Record<string, string | undefined>);
  if (!smtpConfig) throw new SendOutreachError("SMTP ist noch nicht eingerichtet (SMTP_HOST/PORT/USER/PASSWORD/FROM_EMAIL fehlen).", 503);
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) throw new SendOutreachError("Unternehmen wurde nicht gefunden.", 404);
  if (!company.email.trim()) throw new SendOutreachError("Für dieses Unternehmen ist keine E-Mail-Adresse hinterlegt.", 400);
  return { db, company, smtpConfig };
}

/**
 * Versendet die feste Aussendung 1, 2 oder 3 (schiebt die Firma in die passende Kontakt-Stufe)
 * oder die Zusage-E-Mail 4 (Bitte um verbindliche Anmeldung, ändert die Stufe nicht).
 */
export async function sendOutreachEmail(params: { companyId: number; step: number; triggeredBy: "manual" | "auto" }) {
  const { db, company, smtpConfig } = await loadCompany(params.companyId);
  const step = Math.min(Math.max(Math.round(params.step), 1), 4);
  const subject = outreachSubject(step);
  const body = renderOutreachText(step, company.salutation);
  const { to, testNote } = resolveRecipient(company.email.trim());
  const text = testNote ? `[${testNote}]\n\n${body}` : body;
  const html = renderOutreachHtml(step, company.salutation, testNote);

  await sendSmtpMail(smtpConfig, { to, subject, body: text, html });

  const sentAt = new Date().toISOString();
  await db.insert(outreachEmails).values({ companyId: company.id, stepNumber: step, subject, body, sentTo: to, triggeredBy: params.triggeredBy, sentAt });

  if (step === 4) {
    const [updated] = await db.update(companies).set({ lastActivityAt: sentAt, updatedAt: sentAt, notionSyncedAt: null }).where(eq(companies.id, company.id)).returning();
    return { sentTo: to, testMode: Boolean(testNote), company: updated };
  }

  const stage = stageAfterEmail(company.stage, step);
  const [updated] = await db.update(companies).set({
    outreachStep: Math.max(company.outreachStep, step),
    lastOutreachAt: sentAt,
    awaitingReply: 1,
    stage,
    ...(stage !== company.stage ? { stageChangedAt: sentAt } : {}),
    updatedAt: sentAt,
    notionSyncedAt: null
  }).where(eq(companies.id, company.id)).returning();

  return { sentTo: to, testMode: Boolean(testNote), company: updated };
}

export async function sendConfirmationEmail(params: { companyId: number; subject: string; body: string }) {
  const { db, company, smtpConfig } = await loadCompany(params.companyId);
  const { to, testNote } = resolveRecipient(company.email.trim());
  const text = testNote ? `[${testNote}]\n\n${params.body}` : params.body;
  await sendSmtpMail(smtpConfig, { to, subject: params.subject, body: text, html: renderPlainHtml(params.body, testNote) });

  const sentAt = new Date().toISOString();
  await db.insert(outreachEmails).values({
    companyId: company.id, stepNumber: 0, subject: params.subject, body: params.body,
    sentTo: to, triggeredBy: "manual", sentAt
  });
  await db.update(companies).set({ lastActivityAt: sentAt, updatedAt: sentAt, notionSyncedAt: null }).where(eq(companies.id, company.id));

  return { sentTo: to, testMode: Boolean(testNote) };
}
