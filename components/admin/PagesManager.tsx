"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { deleteFundraiser } from "@/app/[locale]/admin/(protected)/osoblje/actions";
import { FundraiserStatusButtons } from "@/components/admin/FundraiserModeration";
import type { MemberPage } from "@/components/admin/MembersManager";
import { TestFlagButtons } from "@/components/admin/TestFlagButtons";
import { Chip, DataTable, bulkButton, type Column } from "@/components/console/DataTable";
import { FocusChip } from "@/components/console/FocusChip";
import { useDialog } from "@/components/console/useDialog";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * Every fundraising page: who runs it, which cause and team it raises for,
 * its state. A fundraiser is a person and may hold several pages; the
 * pages are what donors see, so they get a list of their own. Deleting is
 * for a page made by mistake; the database refuses one that took gifts.
 */
export function PagesManager({ pages, canManage, focus = null }: { pages: MemberPage[]; canManage: boolean; focus?: { label: string; clearHref: string } | null }) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string[]>([]);
  const money = (cents: number) => formatCents(cents, locale, { trimWholeCents: true });

  const remove = async (ids: string[], clear: () => void) => {
    if (!(await dialog.confirm(t("pagesDeleteConfirm", { count: ids.length })))) return;
    setBusy(true);
    setNotice([]);
    const blocked: string[] = [];
    let failed = false;
    for (const id of ids) {
      const result = await deleteFundraiser({ id }).catch(() => null);
      if (!result?.ok) failed = true;
      else for (const b of result.blocked) blocked.push(t("pageDeleteBlocked", { title: b.name, count: b.count }));
    }
    setBusy(false);
    if (failed) await dialog.alert(t("actionError"));
    setNotice(blocked);
    clear();
    router.refresh();
  };

  const columns: Column<MemberPage>[] = [
    {
      key: "title",
      header: t("table.colTitle"),
      cell: (p) => (
        <span className="inline-flex max-w-[300px] items-center gap-1.5">
          {p.status === "active" ? <Link href={`/f/${p.slug}`} className="truncate font-semibold hover:text-sea">{p.title}</Link> : <span className="truncate font-semibold">{p.title}</span>}
          {p.is_test ? <Chip tone="red">{t("testChip")}</Chip> : null}
        </span>
      ),
      sort: (p) => p.title,
    },
    { key: "owner", header: t("pgColFundraiser"), cell: (p) => <span className="text-black/70">{p.owner_name}</span>, sort: (p) => p.owner_name },
    { key: "cause", header: t("tmColCause"), cell: (p) => <span className="text-black/70">{p.event_name}</span>, sort: (p) => p.event_name },
    { key: "team", header: t("pgColTeam"), cell: (p) => <span className="text-black/70">{p.team_name ?? "—"}</span>, sort: (p) => p.team_name ?? "" },
    {
      key: "status",
      header: t("table.colStatus"),
      cell: (p) => <Chip tone={p.status === "active" ? "sea" : p.status === "hidden" ? "red" : "paper"}>{t(`pageStatusValue.${p.status}`)}</Chip>,
      sort: (p) => p.status,
      filter: {
        options: (["active", "draft", "hidden"] as const).map((value) => ({ value, label: t(`pageStatusValue.${value}`) })),
        match: (p, value) => p.status === value,
      },
    },
    { key: "goal", header: t("table.colGoal"), align: "right", cell: (p) => <span className="font-mono tabular-nums">{p.goal_cents ? money(p.goal_cents) : "—"}</span>, sort: (p) => p.goal_cents ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {dialog.element}
      {notice.length > 0 ? (
        <div role="alert" className="rounded-lg bg-mist px-4 py-3 text-[14px] font-semibold text-red-dark">
          {notice.map((line) => <p key={line}>{line}</p>)}
        </div>
      ) : null}
      <DataTable
        rows={pages}
        getId={(p) => p.id}
        columns={columns}
        onOpen={(p) => window.open(`/f/${p.slug}`, "_blank", "noopener")}
        searchText={(p) => `${p.title} ${p.owner_name} ${p.event_name} ${p.team_name ?? ""}`}
        emptyLabel={t("pagesEmpty")}
        filterSlot={focus ? <FocusChip label={focus.label} clearHref={focus.clearHref} /> : undefined}
        rowActions={(p) => <FundraiserStatusButtons fundraiserId={p.id} status={p.status} />}
        bulkActions={canManage ? (ids, clear) => (
          <>
            <TestFlagButtons kind="fundraiser" ids={ids} isTest={(id) => Boolean(pages.find((p) => p.id === id)?.is_test)} clear={clear} disabled={busy} />
            <button type="button" disabled={busy} onClick={() => remove(ids, clear)} className={bulkButton}>{t("evDelete")}</button>
          </>
        ) : undefined}
      />
    </div>
  );
}
