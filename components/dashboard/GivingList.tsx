"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { resendMyReceipt } from "@/app/[locale]/dashboard/(protected)/donacije/actions";
import { CopyButton } from "@/components/donate/CopyButton";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface MyDonation {
  id: string;
  entry_date: string;
  amount_cents: number;
  fee_covered_cents: number;
  net_cents: number;
  rail: "card" | "sepa" | "cash" | "other";
  status: "pending" | "approved" | "declined" | "refunded";
  is_recurring: boolean;
  is_anonymous: boolean;
  fundraiser_slug: string | null;
  fundraiser_title: string | null;
  campaign_slug: string | null;
  campaign_title: string | null;
  event_name: string | null;
  payment_reference: string | null;
}

/** The member's donation history with receipts and open SEPA pledges. */
export function GivingList({ donations }: { donations: MyDonation[] }) {
  const t = useTranslations("giving");
  const tDonate = useTranslations("donate");
  const locale = useLocale() as Locale;
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, "sent" | "error">>({});

  const resend = async (id: string) => {
    setBusy(id);
    const result = await resendMyReceipt({ donationId: id }).catch(() => ({ ok: false as const }));
    setBusy(null);
    setNotice((current) => ({ ...current, [id]: result.ok ? "sent" : "error" }));
  };

  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  return (
    <ul className="mt-3 space-y-2">
      {donations.map((donation) => {
        const target = donation.fundraiser_slug
          ? { href: `/f/${donation.fundraiser_slug}`, label: donation.fundraiser_title ?? "" }
          : donation.campaign_slug
            ? { href: `/kampanje/${donation.campaign_slug}`, label: donation.campaign_title ?? "" }
            : null;
        const tone =
          donation.status === "approved"
            ? "bg-sea text-paper"
            : donation.status === "pending"
              ? "border border-red text-red-dark"
              : "border border-line text-ink/50";
        return (
          <li key={donation.id} className="rounded-[11px] bg-mist px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[13.5px] tabular-nums text-ink/60">{donation.entry_date}</span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold">
                {target ? (
                  <Link href={target.href} className="hover:text-sea">
                    {target.label}
                  </Link>
                ) : (
                  "Santamore"
                )}
                {donation.event_name ? (
                  <span className="font-normal text-ink/50"> · {donation.event_name}</span>
                ) : null}
              </span>
              <span className="font-mono text-[15px] font-medium tabular-nums">{money(donation.amount_cents)}</span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${tone}`}>
                {t(`status.${donation.status}`)}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-ink/60">
              {t(`rail.${donation.rail}`)}
              {donation.is_recurring ? ` · ${t("monthly")}` : ""}
              {donation.fee_covered_cents > 0
                ? ` · ${t("feeCovered", { amount: money(donation.fee_covered_cents) })}`
                : ""}
              {donation.is_anonymous ? ` · ${t("anonymous")}` : ""}
            </p>

            {donation.status === "pending" && donation.rail === "sepa" && donation.payment_reference ? (
              <div className="mt-2 rounded-[10px] bg-red/8 px-3 py-2.5 text-[14px]">
                <p className="text-red-dark">{t("pendingSepa")}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] tabular-nums">{donation.payment_reference}</span>
                  <CopyButton value={donation.payment_reference} label={tDonate("copy")} copiedLabel={tDonate("copied")} />
                </p>
              </div>
            ) : null}

            {donation.status === "approved" ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy === donation.id}
                  onClick={() => resend(donation.id)}
                  className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
                >
                  {busy === donation.id ? "…" : t("resendReceipt")}
                </button>
                {notice[donation.id] === "sent" ? (
                  <span role="status" className="text-[13px] font-semibold text-sea">{t("receiptSent")}</span>
                ) : null}
                {notice[donation.id] === "error" ? (
                  <span role="alert" className="text-[13px] font-semibold text-red-dark">{t("receiptError")}</span>
                ) : null}
                <Link href="/transparentnost" className="text-[13px] font-semibold text-sea underline underline-offset-2">
                  {t("inLedger")}
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
