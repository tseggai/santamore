"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { deleteTeams } from "@/app/[locale]/admin/(protected)/clanovi/actions";
import type { MemberTeam } from "@/components/admin/MembersManager";
import { DataTable, bulkButton, type Column } from "@/components/console/DataTable";
import { FocusChip } from "@/components/console/FocusChip";
import { useDialog } from "@/components/console/useDialog";
import { Link } from "@/i18n/navigation";

/**
 * Fundraising teams: who captains them, which event and cause they raise
 * for, and how many pages they hold. Deleting is for a team made by
 * mistake; the database refuses one whose pages took donations.
 */
export function TeamsManager({ teams, canManage, focus = null }: { teams: MemberTeam[]; canManage: boolean; focus?: { label: string; clearHref: string } | null }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string[]>([]);
  const dialog = useDialog();

  const remove = async (ids: string[], clear: () => void) => {
    if (!(await dialog.confirm(t("tmDeleteConfirm", { count: ids.length })))) return;
    setBusy(true);
    setNotice([]);
    const result = await deleteTeams({ ids }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    setNotice(result.blocked.map((b) => t("tmDeleteBlocked", { name: b.name, count: b.count })));
    clear();
    router.refresh();
  };

  const columns: Column<MemberTeam>[] = [
    {
      key: "name",
      header: t("table.colName"),
      cell: (tm) => <Link href={`/t/${tm.slug}`} className="block max-w-[260px] truncate font-semibold hover:text-sea">{tm.name}</Link>,
      sort: (tm) => tm.name,
    },
    { key: "event", header: t("tmColEvent"), cell: (tm) => <span className="text-black/70">{tm.event_name}</span>, sort: (tm) => tm.event_name },
    { key: "cause", header: t("tmColCause"), cell: (tm) => <span className="text-black/70">{tm.cause_title ?? "—"}</span>, sort: (tm) => tm.cause_title ?? "" },
    { key: "captain", header: t("tmColCaptain"), cell: (tm) => <span className="text-black/70">{tm.captain_name}</span>, sort: (tm) => tm.captain_name },
    { key: "pages", header: t("tmColPages"), cell: (tm) => <span className="font-mono tabular-nums">{tm.pages}</span>, sort: (tm) => tm.pages, align: "right" },
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
        rows={teams}
        getId={(tm) => tm.id}
        columns={columns}
        onOpen={(tm) => window.open(`/t/${tm.slug}`, "_blank", "noopener")}
        searchText={(tm) => `${tm.name} ${tm.event_name} ${tm.captain_name}`}
        emptyLabel={t("tmEmpty")}
        filterSlot={focus ? <FocusChip label={focus.label} clearHref={focus.clearHref} /> : undefined}
        bulkActions={canManage ? (ids, clear) => (
          <button type="button" disabled={busy} onClick={() => remove(ids, clear)} className={bulkButton}>{t("evDelete")}</button>
        ) : undefined}
      />
    </div>
  );
}
