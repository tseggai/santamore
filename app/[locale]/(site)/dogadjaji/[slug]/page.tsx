import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { LeaderboardEntry } from "@/components/Leaderboard";
import {
  EventPageView,
  parseDistances,
  parseTiers,
  type EventView,
} from "@/components/events/EventPageView";
import {
  formatMetricValue,
  metricValue,
  type ActivityTotals,
  type ChallengeMetric,
} from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

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
  await getTranslations("events");

  const event = await fetchEvent(slug);
  if (!event) notFound();

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

  // schema.org Event — only fields with real values; the venue joins once
  // the placeholder is replaced (docs/PLACEHOLDERS.md).
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event" as const,
    name: event.name,
    startDate: event.starts_at,
    ...(event.ends_at ? { endDate: event.ends_at } : {}),
    ...(event.venue && !event.venue.includes("[[")
      ? { location: { "@type": "Place", name: event.venue } }
      : {}),
    organizer: { "@type": "Organization", name: "Santamore" },
  };

  const view: EventView = {
    slug: event.slug,
    name: event.name,
    kind: event.kind,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    venue: event.venue,
    registration_opens_at: event.registration_opens_at,
    registration_closes_at: event.registration_closes_at,
    distances: parseDistances(event.distances),
    tiers: parseTiers(event.price_tiers),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <EventPageView event={view} challengeEntries={challengeEntries} />
    </>
  );
}
