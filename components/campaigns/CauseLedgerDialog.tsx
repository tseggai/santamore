"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { fetchCauseLedger, type CauseLedger } from "@/app/[locale]/(site)/kampanje/actions";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const RAIL_KEYS: Record<string, string> = { card: "railCard", sepa: "railSepa", cash: "railCash", other: "railMixed", recorded: "railRecorded", sponsorship: "railSponsorship" };

function displayDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/**
 * This cause's money in, on top of its page: direct gifts and every euro
 * raised on its events' pages. Money out is decided per chapter, so the
 * overlay says so and points at the full public ledger.
 */
export function CauseLedgerDialog({ slug, className }: { slug: string; className: string }) {
  const t = useTranslations("campaigns");
  const tLedger = useTranslations("ledger");
  const locale = useLocale() as Locale;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [ledger, setLedger] = useState<CauseLedger | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const show = async () => {
    setOpen(true);
    if (!ledger) setLedger(await fetchCauseLedger(slug).catch(() => ({ rows: [], totalCents: 0, donorCount: 0 })));
  };
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  return (
    <>
      <a
        href={`/${locale}/transparentnost`}
        onClick={(e) => {
          e.preventDefault();
          void show();
        }}
        className={className}
      >
        {t("ledgerLink")}
      </a>
      <dialog
        ref={dialogRef}
        aria-label={t("ledgerTitle")}
        onClose={() => setOpen(false)}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-ink/55 open:flex sm:items-center sm:p-4"
      >
        <div className="relative flex max-h-[100dvh] w-full max-w-[600px] flex-col rounded-t-lg bg-paper shadow-[0_24px_60px_rgba(14,58,70,0.25)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg">
          <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-mist text-[19px] leading-none text-black/70 transition-colors hover:bg-mist-2 hover:text-sea">
            ×
          </button>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-8 sm:px-7">
            <p className="type-eyebrow text-sea/80">{t("eyebrow")}</p>
            <h2 className="type-display mt-2 text-3xl">{t("ledgerTitle")}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-black/65">{t("ledgerSub")}</p>
            {ledger === null ? (
              <div aria-busy className="mt-5 space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-mist motion-reduce:animate-none" />)}
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 rounded-lg bg-mist px-4 py-3">
                  <span className="font-mono text-2xl font-extrabold tabular-nums">{money(ledger.totalCents)}</span>
                  <span className="text-[14px] text-black/60">{t("ledgerTotal", { count: ledger.donorCount })}</span>
                </div>
                {ledger.rows.length === 0 ? (
                  <p className="mt-4 text-[14.5px] text-black/60">{t("ledgerEmpty")}</p>
                ) : (
                  <ul className="mt-4">
                    {ledger.rows.map((row) => (
                      <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b-[0.5px] border-line py-2.5 text-[14.5px] last:border-b-0">
                        <span className="font-mono text-[12.5px] tabular-nums text-black/55">{displayDate(row.entry_date)}</span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold">{row.display_name ?? tLedger("anonymous")}</span>
                          {row.fundraiser_title ? <span className="text-black/55"> · {t("viaPage", { title: row.fundraiser_title })}</span> : null}
                        </span>
                        <span className="rounded-[5px] bg-mist px-1.5 py-[3px] font-mono text-[11px] uppercase tracking-[0.05em] text-black/60">{tLedger(RAIL_KEYS[row.rail] ?? "railMixed")}</span>
                        <span className={`font-mono font-semibold tabular-nums ${row.amount_cents < 0 ? "text-red-dark" : ""}`}>{money(row.amount_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <p className="mt-5 rounded-lg bg-mist px-4 py-3 text-[14px] leading-relaxed text-black/70">
              {t("ledgerOutNote")}{" "}
              <Link href="/transparentnost" className="font-semibold text-sea underline underline-offset-2 hover:text-sea-2">{t("ledgerFull")}</Link>
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
