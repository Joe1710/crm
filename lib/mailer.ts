import { env } from "cloudflare:workers";
import { LogLevel, WorkerMailer } from "worker-mailer";

type MailerRuntime = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM_EMAIL?: string;
  MAIL_FROM_NAME?: string;
  MAIL_TEST_MODE_ADDRESS?: string;
};

export class MailerApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "MailerApiError";
  }
}

function config() {
  const runtime = env as unknown as MailerRuntime;
  const host = runtime.SMTP_HOST?.trim();
  const user = runtime.SMTP_USER?.trim();
  const password = runtime.SMTP_PASSWORD?.trim();
  return {
    host,
    port: Number(runtime.SMTP_PORT?.trim()) || 465,
    user,
    password,
    fromEmail: runtime.SMTP_FROM_EMAIL?.trim() || user,
    fromName: runtime.MAIL_FROM_NAME?.trim() || "KI Masterclass",
    testAddress: runtime.MAIL_TEST_MODE_ADDRESS?.trim()
  };
}

export function mailerConfigured() {
  const c = config();
  return Boolean(c.host && c.user && c.password);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string, status: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new MailerApiError(message, status)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

export async function sendMail(input: { to: string; subject: string; text: string }) {
  const c = config();
  if (!c.host || !c.user || !c.password) {
    throw new MailerApiError("SMTP ist noch nicht eingerichtet. Bitte Zugangsdaten hinterlegen.", 503);
  }

  const to = c.testAddress || input.to;
  const subject = c.testAddress ? `[TEST] ${input.subject}` : input.subject;

  try {
    await withTimeout((async () => {
      const mailer = await WorkerMailer.connect({
        host: c.host!,
        port: c.port,
        secure: c.port === 465,
        startTls: c.port !== 465,
        credentials: { username: c.user!, password: c.password! },
        authType: "plain",
        logLevel: LogLevel.ERROR
      });
      try {
        await mailer.send({ from: { name: c.fromName, email: c.fromEmail! }, to, subject, text: input.text });
      } finally {
        await mailer.close();
      }
    })(), 25_000, "Der Versand hat das Zeitlimit überschritten. Bitte erneut versuchen.", 504);
  } catch (error) {
    if (error instanceof MailerApiError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    if (lower.includes("auth")) {
      throw new MailerApiError("Anmeldung beim Mailserver ist fehlgeschlagen. Bitte Zugangsdaten prüfen.", 401);
    }
    if (lower.includes("recipient") || lower.includes("rcpt") || /\b55[013]\b/.test(lower)) {
      throw new MailerApiError("Die Empfängeradresse wurde vom Mailserver abgelehnt.", 422);
    }
    if (lower.includes("connect") || lower.includes("timeout") || lower.includes("socket")) {
      throw new MailerApiError("Der Mailserver konnte nicht erreicht werden. Bitte später erneut versuchen.", 502);
    }
    throw new MailerApiError(`Mailversand fehlgeschlagen: ${message}`, 502);
  }
}
