import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LedgerTabs, type LedgerRow } from "@/components/ledger/LedgerTabs";
import { formatCents } from "@/lib/money";
import { disbursementDocUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const RAIL_KEYS: Record<string, string> = {
  card: "railCard",
  sepa: "railSepa",
  cash: "railCash",
  other: "railMixed",
};

interface InRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  display_name: string | null;
  fundraiser_title: string | null;
  campaign_title: string | null;
  chapter_slug: string | null;
  rail: string;
}
interface OutRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  beneficiary_label: string;
  category: string | null;
  chapter_slug: string | null;
  documentation_paths: string[];
}
interface AdjRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  reason: string;
  references_donation_id: string | null;
  references_disbursement_id: string | null;
}

async function fetchLedger() {
  const supabase = await createClient();
  const [summary, ops, inRows, outRows, adjustments] = await Promise.all([
    supabase.from("v_public_ledger_summary").select("*").single(),
    supabase.from("v_public_ops_total").select("*").single(),
    supabase
      .from("v_public_ledger_in")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(150),
    supabase
      .from("v_public_ledger_out")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(150),
    supabase
      .from("v_public_ledger_adjustments")
      .select("*")
      .order("entry_date", { ascending: false })
      .limit(100),
  ]);
  return {
    summary: summary.data as {
      received_cents: number;
      disbursed_cents: number;
      approved_pending_cents: number;
      unallocated_cents: number;
    } | null,
    opsCents: (ops.data as { operations_cents: number } | null)?.operations_cents ?? 0,
    inRows: (inRows.data ?? []) as InRow[],
    outRows: (outRows.data ?? []) as OutRow[],
    adjustments: (adjustments.data ?? []) as AdjRow[],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ledger" });
  return { title: `${t("title")} — Santamore` };
}

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ledger");

  const { summary, opsCents, inRows, outRows, adjustments } = await fetchLedger();
  const money = (cents: number) =>
    formatCents(cents, locale as Locale, { trimWholeCents: true });

  const moneyIn: LedgerRow[] = inRows.map((row) => ({
    id: row.id,
    date: row.entry_date,
    name: row.display_name,
    attribution:
      row.fundraiser_title ??
      row.campaign_title ??
      (row.chapter_slug ? row.chapter_slug.toUpperCase() : t("national")),
    railKey: RAIL_KEYS[row.rail] ?? "railMixed",
    amountCents: row.amount_cents,
  }));

  const moneyOut: LedgerRow[] = outRows.map((row) => ({
    id: row.id,
    date: row.entry_date,
    name: row.beneficiary_label,
    attribution: row.chapter_slug ? row.chapter_slug.toUpperCase() : t("national"),
    railKey: null,
    amountCents: row.amount_cents,
    docs: row.documentation_paths.flatMap((path, index) => {
      const url = disbursementDocUrl(path);
      if (!url) return [];
      return [
        {
          url,
          label:
            row.documentation_paths.length > 1
              ? `${t("docPill")} ${index + 1}`
              : t("docPill"),
        },
      ];
    }),
  }));

  // Corrections render inside their direction, as their own dated rows —
  // the append-only ledger never silently alters a published figure.
  for (const adj of adjustments) {
    const row: LedgerRow = {
      id: adj.id,
      date: adj.entry_date,
      name: adj.reason,
      attribution: null,
      railKey: null,
      amountCents: adj.amount_cents,
      correction: true,
    };
    if (adj.references_disbursement_id) moneyOut.push(row);
    else moneyIn.push(row);
  }
  moneyIn.sort((a, b) => b.date.localeCompare(a.date));
  moneyOut.sort((a, b) => b.date.localeCompare(a.date));

  const heroRow = (label: string, cents: number, big = false) => (
    <div
      className={`flex items-baseline justify-between gap-3 py-[7px] text-[12.5px] ${
        big
          ? "mt-1.5 border-t-[1.5px] border-paper/40 pt-3"
          : "border-b border-paper/15"
      }`}
    >
      <span>{label}</span>
      <span
        className={`whitespace-nowrap font-mono tabular-nums ${
          big ? "text-[19px] font-medium" : "text-[15px]"
        }`}
      >
        {money(cents)}
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("eyebrow")}
      </p>
      <h1 className="type-display mt-2 text-3xl sm:text-4xl">{t("title")}</h1>

      {/* dark reconciliation summary, per the prototype */}
      <div className="mt-5 rounded-brand bg-sea p-5 text-paper">
        {heroRow(t("received"), summary?.received_cents ?? 0)}
        {heroRow(t("disbursed"), summary?.disbursed_cents ?? 0)}
        {heroRow(t("approvedPending"), summary?.approved_pending_cents ?? 0)}
        {heroRow(t("unallocated"), summary?.unallocated_cents ?? 0, true)}
      </div>

      {/* the two funds — the core promise, most legible thing on the page */}
      <div className="mt-3 rounded-brand border-[1.5px] border-ink px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea/80">
          {t("twoFunds")}
        </p>
        <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2 text-[12.5px]">
          <span>{t("impactFund")}</span>
          <span className="whitespace-nowrap font-mono text-[13px] font-medium text-red">
            {t("impactFundValue")}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2 text-[12.5px]">
          <span>{t("operationsFund")}</span>
          <span className="whitespace-nowrap font-mono text-[15px] tabular-nums">
            {money(opsCents)}
          </span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink/60">{t("fundsNote")}</p>
      </div>

      <LedgerTabs locale={locale as Locale} moneyIn={moneyIn} moneyOut={moneyOut} />

      {/* CSV downloads are attachment responses, not navigations — plain
          anchors on purpose. */}
      <div className="mt-6 flex flex-wrap gap-3 text-[12.5px] font-semibold">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/ledger/in"
          download
          className="rounded-lg border-[1.5px] border-line px-3 py-1.5 transition-colors hover:border-sea hover:text-sea"
        >
          {t("downloadIn")}
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/ledger/out"
          download
          className="rounded-lg border-[1.5px] border-line px-3 py-1.5 transition-colors hover:border-sea hover:text-sea"
        >
          {t("downloadOut")}
        </a>
      </div>

      <p className="mt-5 text-[11.5px] leading-relaxed text-ink/60">{t("footNote")}</p>
    </div>
  );
}
