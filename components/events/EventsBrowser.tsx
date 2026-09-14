"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { galleryImageUrl } from "@/lib/storage";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export type PublicEventKind = "race" | "challenge" | "social";

export interface PublicEventCard {
  slug: string;
  name: string;
  kind: PublicEventKind;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  cover_path: string | null;
  description: string | null;
}

const KINDS: PublicEventKind[] = ["race", "challenge", "social"];

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Every day an event covers (a challenge spans its period; a race is one day). */
function coveredDays(event: PublicEventCard, limit = 62): string[] {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : start;
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end && days.length < limit) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.length ? days : [dayKey(start)];
}

/**
 * The events we have posted: filter by kind, browse as a list or on a
 * month calendar. Past events stay reachable at the bottom of the list.
 */
export function EventsBrowser({ events }: { events: PublicEventCard[] }) {
  const t = useTranslations("events");
  const locale = useLocale() as Locale;
  const lang = htmlLang(locale);
  const [kind, setKind] = useState<"all" | PublicEventKind>("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => {
    const first = events.find((e) => new Date(e.ends_at ?? e.starts_at) >= today) ?? events[0];
    const base = first ? new Date(first.starts_at) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const filtered = events.filter((e) => kind === "all" || e.kind === kind);
  const now = today.getTime();
  const upcoming = filtered.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now);
  const past = filtered.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() < now).reverse();

  const dateFormat = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" });
  const monthFormat = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" });
  const weekdayFormat = new Intl.DateTimeFormat(lang, { weekday: "short" });
  const kindLabel = (k: PublicEventKind) => (k === "race" ? t("kindRace") : k === "challenge" ? t("kindChallenge") : t("kindSocial"));
  const kindTone = (k: PublicEventKind) => (k === "race" ? "bg-red text-paper" : k === "challenge" ? "bg-sea text-paper" : "bg-ink text-paper");

  // Calendar grid: Monday-first, six rows at most.
  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      cells.push({ date, inMonth: date.getMonth() === month.getMonth() });
    }
    const rows = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
    return cells.slice(0, rows * 7);
  }, [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, PublicEventCard[]>();
    for (const event of filtered) for (const day of coveredDays(event)) map.set(day, [...(map.get(day) ?? []), event]);
    return map;
  }, [filtered]);
  const weekdays = grid.slice(0, 7).map((cell) => weekdayFormat.format(cell.date));
  const todayKey = dayKey(today);

  const chip = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors ${active ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"}`;

  const card = (event: PublicEventCard, muted = false) => {
    const cover = galleryImageUrl(event.cover_path);
    return (
      <li key={event.slug}>
        <Link
          href={`/dogadjaji/${event.slug}`}
          className={`flex gap-4 rounded-lg bg-mist p-3 transition-colors hover:bg-mist-2 sm:p-4 ${muted ? "opacity-70 hover:opacity-100" : ""}`}
        >
          {cover ? (
            <Image src={cover} alt="" width={320} height={240} className="h-24 w-32 shrink-0 rounded-lg bg-paper object-cover sm:h-28 sm:w-44" />
          ) : (
            <span className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-paper font-display text-2xl text-black/30 sm:h-28 sm:w-44">
              {event.name.charAt(0)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${kindTone(event.kind)}`}>{kindLabel(event.kind)}</span>
              <span className="font-mono text-[13px] tabular-nums text-black/60">
                {dateFormat.format(new Date(event.starts_at))}
                {event.kind === "challenge" && event.ends_at ? ` — ${dateFormat.format(new Date(event.ends_at))}` : ""}
              </span>
            </span>
            <span className="type-display mt-1.5 block text-xl leading-tight">{event.name}</span>
            {event.venue ? <span className="mt-1 block text-[14px] text-black/60">{event.venue}</span> : null}
            {event.description ? <span className="mt-1 hidden text-[14px] leading-relaxed text-black/70 sm:line-clamp-2">{event.description}</span> : null}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("filterKind")} className="flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")} className={chip(kind === "all")}>{t("filterAll")}</button>
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>{kindLabel(k)}</button>
          ))}
        </div>
        <div role="group" aria-label={t("viewLabel")} className="ml-auto flex gap-1.5">
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={chip(view === "list")}>{t("viewList")}</button>
          <button type="button" aria-pressed={view === "calendar"} onClick={() => setView("calendar")} className={chip(view === "calendar")}>{t("viewCalendar")}</button>
        </div>
      </div>

      {view === "list" ? (
        <div className="mt-5">
          {upcoming.length === 0 && past.length === 0 ? (
            <p className="rounded-lg bg-mist px-5 py-4 text-[14.5px] text-black/70">{t("emptyKind")}</p>
          ) : null}
          {upcoming.length > 0 ? <ul className="space-y-3">{upcoming.map((event) => card(event))}</ul> : null}
          {upcoming.length === 0 && past.length > 0 ? (
            <p className="rounded-lg bg-mist px-5 py-4 text-[14.5px] text-black/70">{t("noUpcoming")}</p>
          ) : null}
          {past.length > 0 ? (
            <>
              <p className="type-eyebrow mt-8 text-black/60">{t("pastHeading")}</p>
              <ul className="mt-3 space-y-3">{past.map((event) => card(event, true))}</ul>
            </>
          ) : null}
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg bg-mist px-3 py-2 text-[15px] font-semibold hover:bg-mist-2" aria-label={t("prevMonth")}>←</button>
            <p className="type-display text-xl capitalize">{monthFormat.format(month)}</p>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg bg-mist px-3 py-2 text-[15px] font-semibold hover:bg-mist-2" aria-label={t("nextMonth")}>→</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <div className="grid min-w-[560px] grid-cols-7 gap-1">
              {weekdays.map((day) => (
                <div key={day} className="px-1 py-1 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-black/50">{day}</div>
              ))}
              {grid.map(({ date, inMonth }) => {
                const key = dayKey(date);
                const items = byDay.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className={`min-h-[84px] rounded-lg p-1.5 ${inMonth ? "bg-mist" : "bg-mist/40"} ${key === todayKey ? "ring-2 ring-red/60" : ""}`}
                  >
                    <span className={`block font-mono text-[12px] tabular-nums ${inMonth ? "text-black/70" : "text-black/30"}`}>{date.getDate()}</span>
                    <ul className="mt-1 space-y-1">
                      {items.slice(0, 3).map((event) => (
                        <li key={event.slug}>
                          <Link href={`/dogadjaji/${event.slug}`} className={`block truncate rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${kindTone(event.kind)} hover:opacity-90`} title={event.name}>
                            {event.name}
                          </Link>
                        </li>
                      ))}
                      {items.length > 3 ? <li className="px-1 text-[11.5px] text-black/60">+{items.length - 3}</li> : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 flex flex-wrap gap-3 text-[13px] text-black/60">
            {KINDS.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${kindTone(k).split(" ")[0]}`} />
                {kindLabel(k)}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
