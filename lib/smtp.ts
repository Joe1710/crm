import { WorkerMailer } from "worker-mailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
};

export function readSmtpConfig(env: Record<string, string | undefined>): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const port = Number(env.SMTP_PORT);
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD?.trim();
  const fromEmail = env.SMTP_FROM_EMAIL?.trim();
  if (!host || !port || !user || !password || !fromEmail) return null;
  return { host, port, user, password, fromEmail };
}

export async function sendSmtpMail(config: SmtpConfig, mail: { to: string; subject: string; body: string; html?: string; bcc?: string }) {
  const mailer = await WorkerMailer.connect({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    startTls: config.port !== 465,
    credentials: { username: config.user, password: config.password },
    authType: ["plain", "login", "cram-md5"]
  });

  try {
    await mailer.send({
      from: { email: config.fromEmail },
      to: mail.to,
      ...(mail.bcc ? { bcc: mail.bcc } : {}),
      subject: mail.subject,
      text: mail.body,
      ...(mail.html ? { html: mail.html } : {})
    });
  } finally {
    await mailer.close();
  }
}
