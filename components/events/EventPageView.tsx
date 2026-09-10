"use client";

import { useLocale, useTranslations } from "next-intl";

import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { formatCents } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export interface EventTier {
  label: string;
  amount_cents: number;
}

export interface EventView {
  slug: string;
  name: string;
  kind: "race" | "challenge";
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  distances: string[];
  tiers: EventTier[];
}

export function parseTiers(value: unknown): EventTier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry?.label === "string" &&
    typeof entry?.amount_cents === "number" &&
    Number.isInteger(entry.amount_cents)
      ? [{ label: entry.label, amount_cents: entry.amount_cents }]
      : [],
  );
}

export function parseDistances(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((d): d is string => typeof d === "string") : [];
}

/**
 * The public event page body — shared with the admin preview so what
 * staff see while editing is exactly what visitors get. `preview`
 * renders links inert.
 */
export function EventPageView({
  event,
  challengeEntries = [],
  preview = false,
  now = Date.now(),
}: {
  event: EventView;
  challengeEntries?: LeaderboardEntry[];
  preview?: boolean;
  now?: number;
}) {
  const t = useTranslations("events");
  const locale = useLocale() as Locale;
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fmt = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : "—");

  const opensAt = event.registration_opens_at
    ? new Date(event.registration_opens_at).getTime()
    : null;
  const closesAt = event.registration_closes_at
    ? new Date(event.registration_closes_at).getTime()
    : null;
  const registrationState =
    opensAt && now < opensAt ? "before" : closesAt && now > closesAt ? "after" : "open";

  return (
    <div className={`mx-auto max-w-3xl px-5 py-14 ${preview ? "pointer-events-none select-none" : ""}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {event.kind === "challenge" ? t("kindChallenge") : t("kindRace")}
      </p>
      <h1 className="type-display mt-2 text-4xl">{event.name || "…"}</h1>
      <p className="mt-3 text-[14.5px] text-ink/70">
        {fmt(event.starts_at)}
        {event.ends_at ? <> — {fmt(event.ends_at)}</> : null}
        {event.venue ? <> · {event.venue}</> : null}
      </p>

      {event.distances.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.distances.map((distance) => (
            <span
              key={distance}
              className="rounded-full border-[1.5px] border-line px-3 py-1 font-mono text-[12px] tabular-nums"
            >
              {distance}
            </span>
          ))}
        </div>
      ) : null}

      {event.tiers.length > 0 ? (
        <div className="mt-6 max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea/80">
            {t("tiersHeading")}
          </p>
          <ul className="mt-2">
            {event.tiers.map((tier) => (
              <li
                key={tier.label}
                className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2 text-[13.5px] last:border-b-0"
              >
                <span>{tier.label}</span>
                <span className="font-mono font-medium tabular-nums">
                  {formatCents(tier.amount_cents, locale, { trimWholeCents: true })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* two ways in: take part, or raise money for it (your own page or a team) */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        {registrationState === "open" ? (
          <Link
            href={`/dogadjaji/${event.slug}/prijava`}
            className="inline-flex h-12 items-center rounded-xl bg-red px-8 text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
          >
            {t("registerCta")}
          </Link>
        ) : null}
        <Link
          href={`/dashboard?event=${event.slug}`}
          className="inline-flex h-12 items-center rounded-xl border-[1.5px] border-ink px-6 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
        >
          {t("fundraiseCta")}
        </Link>
      </div>
      {registrationState !== "open" ? (
        <p className="mt-4 rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[13.5px] text-sea">
          {registrationState === "before"
            ? t("registrationOpens", { date: fmt(event.registration_opens_at) })
            : t("registrationClosed")}
        </p>
      ) : null}

      {event.kind === "challenge" && challengeEntries.length > 0 ? (
        <div className="mt-10">
          <h2 className="type-display text-2xl">{t("challengeBoard")}</h2>
          <LeaderboardList locale={locale} entries={challengeEntries} />
        </div>
      ) : null}

      <p className="mt-10 text-[13.5px]">
        <Link
          href="/prikupljaci"
          className="font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
        >
          {t("moneyBoardLink")}
        </Link>
        {" · "}
        <Link
          href="/uslovi-ucesca"
          className="font-semibold text-sea underline decoration-line underline-offset-2 hover:text-sea-2"
        >
          {t("termsLink")}
        </Link>
      </p>
    </div>
  );
}
