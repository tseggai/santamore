"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { deleteEvents, setEventPublished, setEventsPublished } from "@/app/[locale]/admin/(protected)/dogadjaji/actions";
import { EventForm, type EventFormValues, type Option } from "@/components/admin/EventForm";
import type { GalleryAdminItem } from "@/components/admin/GalleryManager";
import type { PerkChallengeAdminRow } from "@/components/admin/OffersPanel";
import { Chip, DataTable, Thumb, bulkButton, iconButton, rowButton, type Column } from "@/components/console/DataTable";
import { ExternalIcon, EyeIcon } from "@/components/Icons";
import { StravaWebhookButton } from "@/components/admin/StravaWebhookPanel";
import { PageHeader } from "@/components/console/PageHeader";
import { SidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";
import type { WebhookStatus } from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { galleryImageUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";

export interface EventListRow extends EventFormValues {
  id: string;
  registrations: number;
  pages: number;
  going: number;
  offers: PerkChallengeAdminRow[];
  gallery: GalleryAdminItem[];
}

const KINDS = ["race", "challenge", "social"] as const;

/**
 * Event list: one row per event, filter by kind and status, the row opens
 * the editor in the panel. Publish is a one-click toggle because it is
 * the thing staff reach for on event day; bulk for the season.
 */
export function EventsManager({
  events,
  chapters,
  campaigns,
  supporters,
  webhook,
  dateLabels,
  title,
  lead,
  initialOpenId = "",
}: {
  title: string;
  lead: string;
  /** An event to open straight away, e.g. from the Photos overview. */
  initialOpenId?: string;
  events: EventListRow[];
  chapters: Option[];
  campaigns: Option[];
  supporters: Option[];
  webhook: WebhookStatus;
  /** Pre-formatted starts_at per event id (server-side Intl). */
  dateLabels: Record<string, string>;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>(events.some((e) => e.id === initialOpenId) ? initialOpenId : "");
  const [busy, setBusy] = useState<string | null>(null);
  const openEvent = events.find((candidate) => candidate.id === open) ?? null;

  const togglePublished = async (event: EventListRow) => {
    setBusy(event.id);
    await setEventPublished({ id: event.id, published: !event.is_published }).catch(() => null);
    setBusy(null);
    router.refresh();
  };
  const bulkPublish = async (ids: string[], published: boolean, clear: () => void) => {
    setBusy("bulk");
    await setEventsPublished({ ids, published }).catch(() => null);
    setBusy(null);
    clear();
    router.refresh();
  };
  // Deleting is for an event added by mistake; the database refuses one
  // with pages, teams, donations or paid registrations and says why.
  const [notice, setNotice] = useState<string[]>([]);
  const dialog = useDialog();
  const remove = async (ids: string[], clear: () => void) => {
    if (!(await dialog.confirm(t("evDeleteConfirm", { count: ids.length })))) return;
    setBusy("bulk");
    setNotice([]);
    const result = await deleteEvents({ ids }).catch(() => null);
    setBusy(null);
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    setNotice(result.blocked.map((b) => t("evDeleteBlocked", { name: b.name, reason: t(`evDeleteReason_${b.reason}`, { count: b.count }) })));
    clear();
    if (ids.includes(open) && !result.blocked.length) setOpen("");
    router.refresh();
  };

  const columns: Column<EventListRow>[] = [
    {
      key: "name",
      header: t("table.colName"),
      cell: (e) => <span className="block max-w-[260px] truncate font-semibold">{e.name}</span>,
      sort: (e) => e.name,
    },
    {
      key: "kind",
      header: t("table.colKind"),
      cell: (e) => <Chip>{t(`evKind_${e.kind}`)}</Chip>,
      sort: (e) => e.kind,
      filter: {
        options: KINDS.map((kind) => ({ value: kind, label: t(`evKind_${kind}`) })),
        match: (e, value) => e.kind === value,
      },
    },
    {
      key: "status",
      header: t("table.colStatus"),
      cell: (e) => (e.is_published ? <Chip tone="sea">{t("postLive")}</Chip> : <Chip>{t("postDraft")}</Chip>),
      sort: (e) => (e.is_published ? 1 : 0),
      filter: {
        options: [
          { value: "live", label: t("postLive") },
          { value: "draft", label: t("postDraft") },
        ],
        match: (e, value) => (value === "live" ? e.is_published : !e.is_published),
      },
    },
    {
      key: "date",
      header: t("table.colDate"),
      cell: (e) => <span className="font-mono tabular-nums text-black/70">{dateLabels[e.id]}</span>,
      sort: (e) => e.starts_at,
    },
    {
      key: "venue",
      header: t("table.colVenue"),
      cell: (e) => <span className="block max-w-[180px] truncate text-black/60">{e.venue ?? "—"}</span>,
      sort: (e) => e.venue,
    },
    {
      key: "registrations",
      header: t("table.colRegistrations"),
      align: "center",
      cell: (e) => (
        <Link href={`/admin/dogadjaji/prijave?event=${e.id}`} className="underline underline-offset-2 hover:text-sea">{e.registrations}</Link>
      ),
      sort: (e) => e.registrations,
    },
    { key: "pages", header: t("table.colPages"), align: "center", cell: (e) => e.pages, sort: (e) => e.pages },
    { key: "going", header: t("table.colGoing"), align: "center", cell: (e) => e.going, sort: (e) => e.going },
  ];

  return (
    <div className="space-y-4">
      {dialog.element}
      <PageHeader
        title={title}
        lead={lead}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <StravaWebhookButton webhook={webhook} />
            <button type="button" onClick={() => setOpen("new")} className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark">
              + {t("evNew")}
            </button>
          </span>
        }
      />
      <SidePanel
        open={open !== ""}
        title={open === "new" ? t("evNew") : (openEvent?.name ?? "")}
        onClose={() => setOpen("")}
        wide
      >
        <EventForm
          key={openEvent ? `${open}:row` : open}
          event={openEvent}
          chapters={chapters}
          campaigns={campaigns}
          supporters={supporters}
          offers={openEvent?.offers}
          gallery={openEvent?.gallery}
          onDone={() => setOpen("")}
          onCreated={(id) => setOpen(id)}
        />
      </SidePanel>

      {notice.length > 0 ? (
        <div role="alert" className="mb-4 rounded-lg bg-mist px-4 py-3 text-[14px] font-semibold text-red-dark">
          {notice.map((line) => <p key={line}>{line}</p>)}
        </div>
      ) : null}
      <DataTable
        rows={events}
        getId={(e) => e.id}
        columns={columns}
        leading={(e) => <Thumb src={galleryImageUrl(e.cover_path ?? null)} initial={e.name.charAt(0).toUpperCase()} />}
        onOpen={(e) => setOpen(e.id)}
        searchText={(e) => `${e.name} ${e.slug} ${e.venue ?? ""}`}
        emptyLabel={t("regNoEvents")}
        rowActions={(e) => (
          <>
            {e.is_published ? (
              <Link href={`/dogadjaji/${e.slug}`} target="_blank" className={iconButton} aria-label={t("table.view")} title={t("table.view")}>
                <ExternalIcon />
              </Link>
            ) : (
              <button type="button" onClick={() => setOpen(e.id)} className={iconButton} aria-label={t("previewShow")} title={t("previewShow")}>
                <EyeIcon />
              </button>
            )}
            <button type="button" disabled={busy === e.id} onClick={() => togglePublished(e)} className={rowButton}>
              {e.is_published ? t("galleryUnpublish") : t("galleryPublish")}
            </button>
          </>
        )}
        bulkActions={(ids, clear) => (
          <>
            <button type="button" disabled={busy === "bulk"} onClick={() => bulkPublish(ids, true, clear)} className={bulkButton}>{t("galleryPublish")}</button>
            <button type="button" disabled={busy === "bulk"} onClick={() => bulkPublish(ids, false, clear)} className={bulkButton}>{t("galleryUnpublish")}</button>
            <button type="button" disabled={busy === "bulk"} onClick={() => remove(ids, clear)} className={bulkButton}>{t("evDelete")}</button>
          </>
        )}
      />
    </div>
  );
}
