import "server-only";

import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send via Resend. When RESEND_API_KEY / EMAIL_FROM are unset (local dev,
 * previews, before the sending domain is verified) this no-ops with a log —
 * without the recipient address, which is donor PII.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[email] not configured — skipped sending "${message.subject}"`);
    return;
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (error) {
    throw new Error(`email send failed: ${error.message}`);
  }
}
