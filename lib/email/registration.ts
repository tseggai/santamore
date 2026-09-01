import "server-only";

import { getTranslations } from "next-intl/server";

import { bankLines } from "@/lib/email/donation";
import { formatCents, type Cents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import type { EmailMessage } from "@/lib/email/send";

export interface RegistrationEmailInput {
  locale: Locale;
  name: string;
  email: string;
  eventName: string;
  distance: string | null;
  tierLabel: string | null;
  reference: string;
  amountDueCents: Cents;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Entry-fee transfer instructions. Fees are Operations Fund money — the
 * copy says so, keeping the 100%-of-donations promise clean.
 */
export async function buildRegistrationEmail(
  input: RegistrationEmailInput,
): Promise<EmailMessage> {
  const t = await getTranslations({ locale: input.locale, namespace: "email.registration" });
  const bank = bankLines();
  const amount = formatCents(input.amountDueCents, input.locale);

  const rows: Array<[string, string]> = [
    [t("event"), input.eventName],
    ...(input.distance ? [[t("distance"), input.distance] as [string, string]] : []),
    [t("beneficiary"), bank.name],
    [t("iban"), bank.iban],
    [t("amount"), amount],
    [t("reference"), input.reference],
  ];

  const text = [
    t("greeting", { name: input.name }),
    "",
    t("intro", { event: input.eventName }),
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    t("whatNext"),
    t("opsNote"),
  ].join("\n");

  const html = `<div style="margin:0 auto;max-width:560px;padding:28px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#36434b;">
  <p style="color:#f35353;font-weight:bold;letter-spacing:0.08em;">SANTAMORE</p>
  <h1 style="font-size:22px;line-height:1.25;">${escapeHtml(t("subject", { event: input.eventName }))}</h1>
  <p>${escapeHtml(t("greeting", { name: input.name }))}</p>
  <p>${escapeHtml(t("intro", { event: input.eventName }))}</p>
  <div style="background:#eaf1f2;border:1.5px dashed #0e3a46;border-radius:14px;padding:16px 18px;margin:18px 0;">
    ${rows
      .map(
        ([label, value]) =>
          `<p style="margin:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#15505f;">${escapeHtml(label)}</span><br><span style="font-family:'DM Mono',Menlo,Consolas,monospace;font-size:15px;">${escapeHtml(value)}</span></p>`,
      )
      .join("\n    ")}
  </div>
  <p>${escapeHtml(t("whatNext"))}</p>
  <p style="color:rgba(54,67,75,0.75);font-size:13px;">${escapeHtml(t("opsNote"))}</p>
</div>`;

  return {
    to: input.email,
    subject: t("subject", { event: input.eventName }),
    html,
    text,
  };
}
