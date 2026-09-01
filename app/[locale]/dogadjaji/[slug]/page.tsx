import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { formatCents } from "@/lib/money";
import {
  formatMetricValue,
  metricValue,
  type ActivityTotals,
  type ChallengeMetric,
} from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface PublicEvent {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  distances: unknown;
  price_tiers: unknown;
  kind: "race" | "challenge";
  challenge_metric: ChallengeMetric | null;
}

interface Tier {
  label: string;
  amount_cents: number;
}

function parseTiers(value: unknown): Tier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    typeof entry?.label === "string" &&
    typeof entry?.amount_cents === "number" &&
    Number.isInteger(entry.amount_cents)
      ? [{ label: entry.label, amount_cents: entry.amount_cents }]
      : [],
  );
}

async function fetchEvent(slug: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_events")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return data as PublicEvent | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  return { title: event ? `${event.name} — Santamore` : "Santamore" };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("events");

  const event = await fetchEvent(slug);
  if (!event) notFound();

  const distances = Array.isArray(event.distances)
    ? (event.distances as string[])
    : [];
  const tiers = parseTiers(event.price_tiers);
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const now = Date.now();
  const opensAt = event.registration_opens_at
    ? new Date(event.registration_opens_at).getTime()
    : null;
  const closesAt = event.registration_closes_at
    ? new Date(event.registration_closes_at).getTime()
    : null;
  const registrationState =
    opensAt && now < opensAt ? "before" : closesAt && now > closesAt ? "after" : "open";

  // Challenge standings, ranked by the event's declared metric.
  let challengeEntries: LeaderboardEntry[] = [];
  if (event.kind === "challenge" && event.challenge_metric) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("v_activity_totals")
        .select("*")
        .eq("event_id", event.id)
        .order(event.challenge_metric, { ascending: false })
        .limit(50);
      const metric = event.challenge_metric;
      challengeEntries = ((data ?? []) as (ActivityTotals & {
        slug: string;
        title: string;
      })[])
        .filter((row) => metricValue(row, metric) > 0)
        .map((row) => ({
          slug: row.slug,
          title: row.title,
          raisedCents: metricValue(row, metric),
          display: formatMetricValue(metricValue(row, metric), metric, locale as Locale),
          href: `/f/${row.slug}`,
        }));
    } catch {
      challengeEntries = [];
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {event.kind === "challenge" ? t("kindChallenge") : t("kindRace")}
      </p>
      <h1 className="type-display mt-2 text-4xl">{event.name}</h1>
      <p className="mt-3 text-[14.5px] text-ink/70">
        {dateFormat.format(new Date(event.starts_at))}
        {event.ends_at ? <> — {dateFormat.format(new Date(event.ends_at))}</> : null}
        {event.venue ? <> · {event.venue}</> : null}
      </p>

      {distances.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {distances.map((distance) => (
            <span
              key={distance}
              className="rounded-full border-[1.5px] border-line px-3 py-1 font-mono text-[12px] tabular-nums"
            >
              {distance}
            </span>
          ))}
        </div>
      ) : null}

      {tiers.length > 0 ? (
        <div className="mt-6 max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea/80">
            {t("tiersHeading")}
          </p>
          <ul className="mt-2">
            {tiers.map((tier) => (
              <li
                key={tier.label}
                className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2 text-[13.5px] last:border-b-0"
              >
                <span>{tier.label}</span>
                <span className="font-mono font-medium tabular-nums">
                  {formatCents(tier.amount_cents, locale as Locale, {
                    trimWholeCents: true,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7">
        {registrationState === "open" ? (
          <Link
            href={`/dogadjaji/${event.slug}/prijava`}
            className="inline-block rounded-xl bg-red px-8 py-3.5 text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
          >
            {t("registerCta")}
          </Link>
        ) : (
          <p className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[13.5px] text-sea">
            {registrationState === "before"
              ? t("registrationOpens", {
                  date: dateFormat.format(new Date(event.registration_opens_at!)),
                })
              : t("registrationClosed")}
          </p>
        )}
      </div>

      {event.kind === "challenge" && challengeEntries.length > 0 ? (
        <div className="mt-10">
          <h2 className="type-display text-2xl">{t("challengeBoard")}</h2>
          <LeaderboardList locale={locale as Locale} entries={challengeEntries} />
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
