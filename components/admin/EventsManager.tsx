"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setEventPublished } from "@/app/[locale]/admin/(protected)/dogadjaji/actions";
import { EventForm, type EventFormValues, type Option } from "@/components/admin/EventForm";
import { SidePanel } from "@/components/console/SidePanel";
import type { PerkChallengeAdminRow } from "@/components/admin/OffersPanel";
import { StravaWebhookPanel } from "@/components/admin/StravaWebhookPanel";
import type { WebhookStatus } from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { Link } from "@/i18n/navigation";

export interface EventListRow extends EventFormValues {
  id: string;
  registrations: number;
  pages: number;
  going: number;
  offers: PerkChallengeAdminRow[];
}

/**
 * Event list with inline edit: one form open at a time, either "new" at
 * the top or the row being edited. Publish is a one-click toggle because
 * it is the thing staff reach for on event day.
 */
export function EventsManager({
  events,
  chapters,
  campaigns,
  supporters,
  webhook,
  dateLabels,
}: {
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
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const openEvent = events.find((candidate) => candidate.id === open) ?? null;

  const togglePublished = async (event: EventListRow) => {
    setBusy(event.id);
    await setEventPublished({ id: event.id, published: !event.is_published }).catch(
      () => null,
    );
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="mt-5 space-y-4">
      <StravaWebhookPanel webhook={webhook} />
      <button
        type="button"
        onClick={() => setOpen("new")}
        className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark"
      >
        + {t("evNew")}
      </button>
      <SidePanel
        open={open !== ""}
        title={open === "new" ? t("evNew") : (openEvent?.name ?? "")}
        onClose={() => setOpen("")}
        wide
      >
        <EventForm
          key={open}
          event={openEvent}
          chapters={chapters}
          campaigns={campaigns}
          supporters={supporters}
          offers={openEvent?.offers}
          onDone={() => setOpen("")}
          onCreated={(id) => setOpen(id)}
        />
      </SidePanel>

      {events.length === 0 ? (
        <p className="text-[14.5px] text-black/60">{t("regNoEvents")}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-brand border-[1.5px] border-line px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                    {event.is_published ? (
                      <Link href={`/dogadjaji/${event.slug}`} className="hover:underline">
                        {event.name}
                      </Link>
                    ) : (
                      event.name
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                        event.is_published
                          ? "bg-sea text-paper"
                          : "border border-line text-black/60"
                      }`}
                    >
                      {event.is_published ? t("postLive") : t("postDraft")}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-black/60">
                      {t(`evKind_${event.kind}`)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-black/60">
                    <span className="font-mono tabular-nums">{dateLabels[event.id]}</span>
                    {event.venue ? <> · {event.venue}</> : null}
                    {" · "}
                    <span className="font-mono">/dogadjaji/{event.slug}</span>
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-black/60">
                    <Link href={`/admin/prijave?event=${event.id}`} className="font-semibold text-sea underline underline-offset-2">
                      {t("evCounts", { registrations: event.registrations, pages: event.pages, going: event.going })}
                    </Link>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpen(event.id)}
                    className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea"
                  >
                    {t("evEdit")}
                  </button>
                  <button
                    type="button"
                    disabled={busy === event.id}
                    onClick={() => togglePublished(event)}
                    className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
                  >
                    {event.is_published ? t("galleryUnpublish") : t("galleryPublish")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
