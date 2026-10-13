import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '../config/env';

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Emails "sent" during tests, for assertions. Always empty outside tests. */
export const outbox: Email[] = [];

let transporter: Promise<Transporter> | null = null;

function createTransporter(): Promise<Transporter> {
  if (isTest) return Promise.resolve(nodemailer.createTransport({ jsonTransport: true }));

  if (env.SMTP_HOST) {
    return Promise.resolve(
      nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      }),
    );
  }

  // No SMTP configured: use a throwaway Ethereal inbox. Mail is never delivered; each message gets a preview URL.
  return nodemailer.createTestAccount().then((account) => {
    console.log(`[mail] No SMTP_HOST set: using Ethereal test inbox ${account.user} (preview links are logged per email)`);
    return nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    });
  });
}

// An object (not bare functions) so tests can stub `mailer.send` to simulate SMTP failures.
export const mailer = {
  async send(email: Email): Promise<void> {
    transporter ??= createTransporter().catch((err) => {
      transporter = null; // retry on the next email
      throw err;
    });
    const info = await (await transporter).sendMail({ from: env.MAIL_FROM, ...email });

    if (isTest) {
      outbox.push(email);
      return;
    }
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`[mail] "${email.subject}" → ${email.to}${preview ? ` | preview: ${preview}` : ''}`);
  },
};
