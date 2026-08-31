import "server-only";

import { getTranslations } from "next-intl/server";

import { formatIbanForDisplay } from "@/lib/epc-qr";
import { formatCents, type Cents } from "@/lib/money";
import { getOrgBankDetails } from "@/lib/org";
import type { Locale } from "@/i18n/routing";
import type { EmailMessage } from "@/lib/email/send";

export interface DonationEmailInput {
  locale: Locale;
  donorName: string;
  donorEmail: string;
  campaignTitle: string;
  reference: string;
  amountCents: Cents;
  isRecurring: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Real bank facts are never invented: until the env vars are set the email
// carries the same visible [[PLACEHOLDER]] markers as the site (pre-launch
// state only; docs/PLACEHOLDERS.md).
function bankLines() {
  const org = getOrgBankDetails();
  return {
    name: org.name.trim() || "[[PLACEHOLDER: registered organisation name]]",
    iban: org.iban.trim() ? formatIbanForDisplay(org.iban) : "[[PLACEHOLDER: IBAN]]",
  };
}

const shellStyle =
  "margin:0 auto;max-width:560px;padding:28px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#36434b;";
const monoStyle =
  "font-family:'DM Mono',Menlo,Consolas,monospace;font-size:15px;letter-spacing:0.02em;";
const boxStyle =
  "background:#eaf1f2;border:1.5px dashed #0e3a46;border-radius:14px;padding:16px 18px;margin:18px 0;";

function shell(title: string, bodyHtml: string): string {
  return `<div style="${shellStyle}">
  <p style="color:#f35353;font-weight:bold;letter-spacing:0.08em;">SANTAMORE</p>
  <h1 style="font-size:22px;line-height:1.25;">${title}</h1>
  ${bodyHtml}
</div>`;
}

export async function buildInstructionsEmail(
  input: DonationEmailInput,
): Promise<EmailMessage> {
  const t = await getTranslations({ locale: input.locale, namespace: "email.instructions" });
  const bank = bankLines();
  const amount = formatCents(input.amountCents, input.locale);
  const campaign = input.campaignTitle;
  const ledgerUrl = `${siteUrl()}/${input.locale}/transparentnost`;

  const intro = input.isRecurring
    ? t("introMonthly", { campaign, amount })
    : t("intro", { campaign, amount });

  const detailRows: Array<[string, string]> = [
    [t("beneficiary"), bank.name],
    [t("iban"), bank.iban],
    [t("amount"), input.isRecurring ? `${amount} ${t("perMonth")}` : amount],
    [t("reference"), input.reference],
  ];

  const text = [
    t("greeting", { name: input.donorName }),
    "",
    intro,
    "",
    t("transferHeading"),
    ...detailRows.map(([label, value]) => `${label}: ${value}`),
    "",
    t("referenceNote"),
    ...(input.isRecurring ? ["", t("standingOrder")] : []),
    "",
    t("whatNext"),
    `${t("ledgerCta")}: ${ledgerUrl}`,
  ].join("\n");

  const html = shell(
    escapeHtml(t("subject", { campaign })),
    `<p>${escapeHtml(t("greeting", { name: input.donorName }))}</p>
<p>${escapeHtml(intro)}</p>
<div style="${boxStyle}">
  ${detailRows
    .map(
      ([label, value]) =>
        `<p style="margin:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#15505f;">${escapeHtml(label)}</span><br><span style="${monoStyle}">${escapeHtml(value)}</span></p>`,
    )
    .join("\n  ")}
</div>
<p>${escapeHtml(t("referenceNote"))}</p>
${input.isRecurring ? `<p>${escapeHtml(t("standingOrder"))}</p>` : ""}
<p>${escapeHtml(t("whatNext"))}</p>
<p><a href="${ledgerUrl}" style="color:#0e3a46;">${escapeHtml(t("ledgerCta"))}</a></p>`,
  );

  return {
    to: input.donorEmail,
    subject: t("subject", { campaign }),
    html,
    text,
  };
}

export async function buildReceiptEmail(input: DonationEmailInput): Promise<EmailMessage> {
  const t = await getTranslations({ locale: input.locale, namespace: "email.receipt" });
  const amount = formatCents(input.amountCents, input.locale);
  const campaign = input.campaignTitle;
  const ledgerUrl = `${siteUrl()}/${input.locale}/transparentnost`;

  const text = [
    t("greeting", { name: input.donorName }),
    "",
    t("body", { campaign, amount }),
    t("reference", { reference: input.reference }),
    "",
    `${t("ledgerCta")}: ${ledgerUrl}`,
  ].join("\n");

  const html = shell(
    escapeHtml(t("subject", { campaign })),
    `<p>${escapeHtml(t("greeting", { name: input.donorName }))}</p>
<p>${escapeHtml(t("body", { campaign, amount }))}</p>
<p style="${monoStyle}">${escapeHtml(t("reference", { reference: input.reference }))}</p>
<p><a href="${ledgerUrl}" style="color:#0e3a46;">${escapeHtml(t("ledgerCta"))}</a></p>`,
  );

  return {
    to: input.donorEmail,
    subject: t("subject", { campaign }),
    html,
    text,
  };
}
