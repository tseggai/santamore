"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatCents, formatSignedCents, type Cents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";

export interface LedgerDoc {
  url: string;
  label: string;
}

export interface LedgerRow {
  id: string;
  /** ISO date, rendered as dd.mm.yyyy. */
  date: string;
  /** Display name (in) or beneficiary label (out); null = anonymous. */
  name: string | null;
  /** Middle pill: fundraiser/campaign title or chapter (in), chapter (out). */
  attribution: string | null;
  /** Rail key (in) — railCard|railSepa|railCash|railMixed. */
  railKey: string | null;
  amountCents: Cents;
  /** Correction rows are signed and visually distinct (append-only ledger). */
  correction?: boolean;
  docs?: LedgerDoc[];
}

function displayDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Money in / money out, per the prototype: seg toggle (money-out default),
 * entry rows with pill metadata, documentation pills linking the proof,
 * corrections as their own dated signed rows.
 */
export function LedgerTabs({
  locale,
  moneyIn,
  moneyOut,
}: {
  locale: Locale;
  moneyIn: LedgerRow[];
  moneyOut: LedgerRow[];
}) {
  const t = useTranslations("ledger");
  const [view, setView] = useState<"out" | "in">("out");

  const pillClass =
    "rounded-[5px] border border-line px-1.5 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.05em] text-ink/60";

  const list = (rows: LedgerRow[], empty: string) =>
    rows.length === 0 ? (
      <p className="py-6 text-[13.5px] text-ink/60">{empty}</p>
    ) : (
      <ul>
        {rows.map((row) => (
          <li key={row.id} className="border-b border-line-soft py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`text-[13px] font-semibold leading-snug ${
                  row.correction ? "text-sea" : ""
                }`}
              >
                {row.correction ? `${t("correction")}: ` : ""}
                {row.name ?? t("anonymous")}
              </span>
              <span className="shrink-0 font-mono text-[13.5px] font-medium tabular-nums">
                {row.correction
                  ? formatSignedCents(row.amountCents, locale)
                  : formatCents(row.amountCents, locale, { trimWholeCents: true })}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="py-[3px] pr-1 font-mono text-[9.5px] uppercase tracking-[0.05em] text-ink/45">
                {displayDate(row.date)}
              </span>
              {row.attribution ? (
                <span className={`${pillClass} max-w-[180px] truncate`}>
                  {row.attribution}
                </span>
              ) : null}
              {row.railKey ? <span className={pillClass}>{t(row.railKey)}</span> : null}
              {(row.docs ?? []).map((doc) => (
                <a
                  key={doc.url}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[5px] border border-sea bg-mist px-1.5 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.05em] text-sea transition-opacity hover:opacity-75"
                >
                  {doc.label} ✓
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <div>
      <div
        role="group"
        aria-label={t("title")}
        className="mt-5 grid grid-cols-2 overflow-hidden rounded-[11px] border-[1.5px] border-ink"
      >
        <button
          type="button"
          aria-pressed={view === "in"}
          onClick={() => setView("in")}
          className="px-3 py-2.5 text-[13px] font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t("moneyIn")}
        </button>
        <button
          type="button"
          aria-pressed={view === "out"}
          onClick={() => setView("out")}
          className="px-3 py-2.5 text-[13px] font-semibold transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {t("moneyOut")}
        </button>
      </div>
      <div className="mt-1.5">
        {view === "out" ? list(moneyOut, t("emptyOut")) : list(moneyIn, t("emptyIn"))}
      </div>
    </div>
  );
}
