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
import { TestFlagButtons } from "@/components/admin/TestFlagButtons";
import { EventPeekPanel, type PeekKind } from "@/components/admin/EventPeekPanel";
import type { EventLinked } from "@/lib/event-linked";
import type { WebhookStatus } from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { galleryImageUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";

export interface EventListRow extends EventFormValues {
  id: string;
  /** Made in test mode, or marked as test afterwards (migration 0055/0056). */
  is_test?: boolean;
  /** Heads coming: uncancelled registrations, guests included, plus RSVPs without one. */
  going: number;
  /** Published pages of the event's cause (pages belong to causes), and the drafts beside them. */
  pages: number;
  pagesDraft: number;
  teams: number;
  offers: PerkChallengeAdminRow[];
  gallery: GalleryAdminItem[];
}

const KINDS = ["race", "challenge", "social"] as const;
const countButton = "rounded px-1.5 py-0.5 font-mono tabular-nums underline underline-offset-2 hover:bg-mist-2 hover:text-sea";

/**
 * Event list: one row per event, filter by kind and status, the row opens
 * the editor in the panel. Publish is a one-click toggle because it is
 * the thing staff reach for on event day; bulk for the season.
 */
export function EventsManager({
  events,
  linked,
  chapters,
  campaigns,
  supporters,
  webhook,
  dateLabels,
  title,
  lead,
  initialOpenId = "",
  canManage = false,
}: {
  /** Left out inside the section: the layout draws the title, the actions go up to it. */
  title?: string;
  lead?: string;
  /** An event to open straight away, e.g. from the Photos overview. */
  initialOpenId?: string;
  /** Admin: deleting and the test flag are theirs (delete_event, set_record_test). */
  canManage?: boolean;
  events: EventListRow[];
  /** The rows behind the counts, for the quick look. */
  linked: EventLinked;
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
  // A count opens what it stands for in the slide-over; the list stays put.
  const [peek, setPeek] = useState<{ kind: PeekKind; eventId: string; eventName: string; campaignId: string | null } | null>(null);
  const isTest = (id: string) => Boolean(events.find((e) => e.id === id)?.is_test);
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
      cell: (e) => (
        <span className="inline-flex items-center gap-1.5">
          {e.is_published ? <Chip tone="sea">{t("postLive")}</Chip> : <Chip>{t("postDraft")}</Chip>}
          {e.is_test ? <Chip tone="red">{t("testChip")}</Chip> : null}
        </span>
      ),
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
      key: "going",
      header: t("table.colGoing"),
      align: "center",
      cell: (e) => <button type="button" onClick={() => setPeek({ kind: "going", eventId: e.id, eventName: e.name, campaignId: e.campaign_id ?? null })} className={countButton}>{e.going}</button>,
      sort: (e) => e.going,
    },
    {
      key: "pages",
      header: t("table.colPages"),
      align: "center",
      cell: (e) => (
        <button type="button" onClick={() => setPeek({ kind: "pages", eventId: e.id, eventName: e.name, campaignId: e.campaign_id ?? null })} className={countButton}>
          {e.pages}
          {e.pagesDraft > 0 ? <span className="ml-1 font-sans text-[12px] font-medium normal-case text-black/50">{t("pagesDraftSuffix", { count: e.pagesDraft })}</span> : null}
        </button>
      ),
      sort: (e) => e.pages,
    },
    {
      key: "teams",
      header: t("table.colTeams"),
      align: "center",
      cell: (e) => <button type="button" onClick={() => setPeek({ kind: "teams", eventId: e.id, eventName: e.name, campaignId: e.campaign_id ?? null })} className={countButton}>{e.teams}</button>,
      sort: (e) => e.teams,
    },
  ];

  return (
    <div className="space-y-4">
      {dialog.element}
      <EventPeekPanel peek={peek} linked={linked} onClose={() => setPeek(null)} />
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
          extra={canManage && openEvent ? (
            <>
              <TestFlagButtons kind="event" ids={[openEvent.id]} isTest={isTest} disabled={busy === "bulk"} className="rounded-lg bg-paper px-3 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60" />
              <button type="button" disabled={busy === "bulk"} onClick={() => void remove([openEvent.id], () => undefined)} className="rounded-lg px-3 py-2 text-[14px] font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-60">
                {t("evDelete")}
              </button>
            </>
          ) : null}
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
            {canManage ? <TestFlagButtons kind="event" ids={ids} isTest={isTest} clear={clear} disabled={busy === "bulk"} /> : null}
            {canManage ? <button type="button" disabled={busy === "bulk"} onClick={() => remove(ids, clear)} className={bulkButton}>{t("evDelete")}</button> : null}
          </>
        )}
      />
    </div>
  );
}
