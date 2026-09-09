"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setEventPublished } from "@/app/[locale]/admin/(protected)/dogadjaji/actions";
import { EventForm, type EventFormValues, type Option } from "@/components/admin/EventForm";
import { Link } from "@/i18n/navigation";

export interface EventListRow extends EventFormValues {
  id: string;
  registrations: number;
  pages: number;
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
  dateLabels,
}: {
  events: EventListRow[];
  chapters: Option[];
  campaigns: Option[];
  /** Pre-formatted starts_at per event id (server-side Intl). */
  dateLabels: Record<string, string>;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState<"" | "new" | string>("");
  const [busy, setBusy] = useState<string | null>(null);

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
      {open === "new" ? (
        <EventForm
          event={null}
          chapters={chapters}
          campaigns={campaigns}
          onDone={() => setOpen("")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen("new")}
          className="rounded-xl bg-red px-4 py-2.5 text-[13.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          + {t("evNew")}
        </button>
      )}

      {events.length === 0 ? (
        <p className="text-[13.5px] text-ink/60">{t("regNoEvents")}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-brand border-[1.5px] border-line px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-bold">
                    {event.is_published ? (
                      <Link href={`/dogadjaji/${event.slug}`} className="hover:underline">
                        {event.name}
                      </Link>
                    ) : (
                      event.name
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                        event.is_published
                          ? "bg-sea text-paper"
                          : "border border-line text-ink/60"
                      }`}
                    >
                      {event.is_published ? t("postLive") : t("postDraft")}
                    </span>
                    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
                      {event.kind === "challenge" ? t("evKindChallenge") : t("evKindRace")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink/60">
                    <span className="font-mono tabular-nums">{dateLabels[event.id]}</span>
                    {event.venue ? <> · {event.venue}</> : null}
                    {" · "}
                    <span className="font-mono">/dogadjaji/{event.slug}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink/60">
                    {t("evCounts", { registrations: event.registrations, pages: event.pages })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpen(open === event.id ? "" : event.id)}
                    className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea"
                  >
                    {t("evEdit")}
                  </button>
                  <button
                    type="button"
                    disabled={busy === event.id}
                    onClick={() => togglePublished(event)}
                    className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
                  >
                    {event.is_published ? t("galleryUnpublish") : t("galleryPublish")}
                  </button>
                </div>
              </div>
              {open === event.id ? (
                <div className="mt-3">
                  <EventForm
                    event={event}
                    chapters={chapters}
                    campaigns={campaigns}
                    onDone={() => setOpen("")}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
