"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Chip, DataTable, type Column } from "@/components/console/DataTable";
import { SidePanel } from "@/components/console/SidePanel";
import { formatShortDate } from "@/lib/dates";
import { formatCents, formatSignedCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export interface DonorRow {
  donor_key: string;
  name: string;
  given_cents: number;
  gifts: number;
  first_date: string;
  last_date: string;
  sources: string[];
  causes: string[];
  user_id: string | null;
}

export interface DonorGift {
  id: string;
  donor_key: string;
  source: string;
  entry_date: string;
  year: number;
  amount_cents: number;
  rail: string;
  name: string | null;
  campaign_title: string | null;
  fundraiser_title: string | null;
}

/**
 * Everyone a money-in row belongs to (v_donors, migration 0067): a gift in
 * the ledger, a name recorded on a year report, a supporter's cash. One row
 * per donor with what they gave; the row opens their gifts.
 */
export function DonorsManager({ donors, gifts }: { donors: DonorRow[]; gifts: DonorGift[] }) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<string | null>(null);
  const money = (cents: number) => (cents < 0 ? formatSignedCents(cents, locale, { trimWholeCents: true }) : formatCents(cents, locale, { trimWholeCents: true }));
  const current = donors.find((d) => d.donor_key === open) ?? null;
  const sourceLabel = (source: string) => t(`dnSource.${source}` as "dnSource.ledger");

  const columns: Column<DonorRow>[] = [
    {
      key: "name",
      header: t("table.colName"),
      cell: (d) => <span className="block max-w-[240px] truncate font-semibold">{d.name || t("dnAnonymous")}</span>,
      sort: (d) => d.name,
    },
    {
      key: "source",
      header: t("dnColSource"),
      cell: (d) => (
        <span className="flex flex-wrap gap-1">
          {d.sources.filter((s) => s !== "adjustment").map((s) => <Chip key={s} tone={s === "ledger" ? "sea" : "paper"}>{sourceLabel(s)}</Chip>)}
          {d.user_id ? <Chip tone="ink">{t("dnAccount")}</Chip> : null}
        </span>
      ),
      filter: {
        options: [
          { value: "ledger", label: sourceLabel("ledger") },
          { value: "recorded", label: sourceLabel("recorded") },
          { value: "sponsorship", label: sourceLabel("sponsorship") },
          { value: "account", label: t("dnAccount") },
        ],
        match: (d, value) => (value === "account" ? Boolean(d.user_id) : d.sources.includes(value)),
      },
    },
    { key: "given", header: t("table.colGiven"), align: "right", cell: (d) => <span className="font-mono tabular-nums">{money(d.given_cents)}</span>, sort: (d) => d.given_cents },
    { key: "gifts", header: t("dnColGifts"), align: "right", cell: (d) => <span className="font-mono tabular-nums">{d.gifts}</span>, sort: (d) => d.gifts },
    { key: "causes", header: t("table.colCauses"), cell: (d) => <span className="block max-w-[260px] truncate text-black/70">{d.causes.join(" · ") || "—"}</span>, sort: (d) => d.causes.join(" ") },
    { key: "last", header: t("dnColLast"), cell: (d) => <span className="font-mono tabular-nums text-black/60">{formatShortDate(d.last_date, locale)}</span>, sort: (d) => d.last_date },
  ];

  const mine = current ? gifts.filter((g) => g.donor_key === current.donor_key).sort((a, b) => b.entry_date.localeCompare(a.entry_date)) : [];

  return (
    <>
      <DataTable
        rows={donors}
        getId={(d) => d.donor_key}
        columns={columns}
        onOpen={(d) => setOpen(d.donor_key)}
        searchText={(d) => `${d.name} ${d.causes.join(" ")}`}
        searchPlaceholder={t("dnSearch")}
        emptyLabel={t("dnEmpty")}
      />
      <SidePanel open={current !== null} title={current?.name || t("dnAnonymous")} onClose={() => setOpen(null)}>
        {current ? (
          <div className="space-y-4">
            <p className="flex flex-wrap items-baseline gap-x-3 text-[14.5px]">
              <span className="font-mono text-2xl font-extrabold tabular-nums">{money(current.given_cents)}</span>
              <span className="text-black/60">{t("dnGiftsSince", { count: current.gifts, date: formatShortDate(current.first_date, locale) })}</span>
            </p>
            {current.user_id ? (
              <p className="text-[14px]">
                <Link href="/admin/osoblje/nalozi" className="font-semibold text-sea underline underline-offset-2">{t("dnOpenAccount")} →</Link>
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {mine.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-paper px-3.5 py-2.5 text-[14px]">
                  <span className="font-mono tabular-nums text-black/60">{formatShortDate(g.entry_date, locale)}</span>
                  <span className="text-black/70">{g.fundraiser_title ?? g.campaign_title ?? "—"}</span>
                  <Chip tone={g.source === "ledger" ? "sea" : "paper"}>{g.source === "ledger" ? g.rail.toUpperCase() : sourceLabel(g.source)}</Chip>
                  <span className="ml-auto font-mono font-semibold tabular-nums">{money(g.amount_cents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
