"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

import { formatShortDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { GiftDetail } from "@/lib/sponsors";
import type { Locale } from "@/i18n/routing";

/**
 * The detail behind a sponsor tile or a donor chip: each gift with what it
 * was for and when. A native <dialog> for the focus trap and Escape; no
 * motion, so nothing to switch off for reduced-motion users.
 */
export function GiftDialog({
  open,
  onClose,
  title,
  eyebrow,
  logo,
  website,
  gifts,
  note,
  extra,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  logo?: string | null;
  website?: string | null;
  gifts: GiftDetail[];
  /** The fund the money went to, in one sentence. */
  note: string;
  /** Anything else under the gifts, e.g. offer links or the beneficiaries. */
  extra?: ReactNode;
}) {
  const t = useTranslations("years");
  const locale = useLocale() as Locale;
  const ref = useRef<HTMLDialogElement>(null);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const total = gifts.reduce((sum, g) => sum + (g.amount_cents ?? 0), 0);
  const cash = gifts.filter((g) => g.amount_cents != null && g.amount_cents > 0);
  const allImpact = cash.length > 0 && cash.every((g) => g.fund === "impact");
  const mixed = cash.some((g) => g.fund === "impact") && !allImpact;
  const inKindOnly = total === 0 && gifts.some((g) => g.in_kind);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-lg bg-paper p-0 text-black shadow-none backdrop:bg-ink/60"
    >
      {open ? (
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            {logo ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-mist p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes */}
                <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="type-eyebrow text-sea/80">{eyebrow}</p>
              <h2 className="mt-1 text-[18px] font-bold leading-snug">{title}</h2>
              {total > 0 ? (
                <p className="mt-1 font-mono text-[22px] font-extrabold tabular-nums text-sea">{money(total)}</p>
              ) : inKindOnly ? (
                <p className="mt-1 text-[15px] font-semibold text-black/60">{t("inKind")}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[20px] leading-none transition-colors hover:bg-mist"
            >
              ×
            </button>
          </div>

          <ul className="mt-4 overflow-hidden rounded-lg bg-mist">
            {gifts.map((gift, index) => (
              <li key={index} className="flex items-baseline justify-between gap-3 border-t-[0.5px] border-line px-3.5 py-2.5 text-[14.5px] first:border-t-0">
                <span className="min-w-0">
                  <span className="block truncate">{gift.target ?? (gift.tier ? gift.tier : t("giftGeneral"))}</span>
                  <span className="block text-[13px] text-black/55">
                    {[gift.target && gift.tier ? gift.tier : null, gift.date ? formatShortDate(gift.date, locale) : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="whitespace-nowrap font-mono text-[14.5px] font-semibold tabular-nums">
                  {gift.amount_cents != null ? money(gift.amount_cents) : gift.in_kind ? t("inKind") : "—"}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[13.5px] leading-relaxed text-black/60">{allImpact ? t("giftImpactNote") : mixed ? `${note} ${t("giftMixedNote")}` : note}</p>
          {extra}
          {website ? (
            <a href={website} target="_blank" rel="noopener" className="mt-3 inline-block text-[14px] font-semibold text-sea underline underline-offset-2">
              {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
