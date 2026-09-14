import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FundraisersBrowser } from "@/components/FundraisersBrowser";
import type { LeaderboardEntry } from "@/components/Leaderboard";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface IndividualRow {
  slug: string;
  title: string;
  photo_path: string | null;
  raised_cents: number;
  event_id: string;
}
interface TeamRow {
  slug: string;
  name: string;
  photo_path: string | null;
  raised_cents: number;
  member_count: number;
  event_id: string;
}
interface EventRow {
  id: string;
  name: string;
}

interface EventOption extends EventRow {
  slug: string;
  starts_at: string | null;
  pages: number;
}

/**
 * The board is per event. Default: the event people are actually raising
 * for (most published pages, upcoming first), then the next event.
 */
async function fetchBoard(eventSlug: string | undefined) {
  try {
    const supabase = await createClient();
    const [{ data: eventRows }, { data: pageRows }] = await Promise.all([
      supabase.from("v_public_events").select("id, slug, name, starts_at").not("campaign_slug", "is", null).order("starts_at", { ascending: true }),
      supabase.from("v_fundraiser_totals").select("event_id, raised_cents"),
    ]);
    const counts = new Map<string, number>();
    for (const row of (pageRows ?? []) as { event_id: string }[]) counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
    const now = Date.now();
    const options: EventOption[] = ((eventRows ?? []) as Omit<EventOption, "pages">[]).map((e) => ({ ...e, pages: counts.get(e.id) ?? 0 }));
    const upcoming = options.filter((e) => !e.starts_at || new Date(e.starts_at).getTime() >= now);
    const chosen =
      options.find((e) => e.slug === eventSlug) ??
      [...upcoming].sort((a, b) => b.pages - a.pages)[0] ??
      [...options].sort((a, b) => b.pages - a.pages)[0] ??
      null;
    if (!chosen) return null;
    const event: EventRow = { id: chosen.id, name: chosen.name };
    const [{ data: individuals }, { data: teams }, { data: allTotals }] = await Promise.all([
      supabase
        .from("v_leaderboard")
        .select("slug, title, photo_path, raised_cents, event_id")
        .eq("event_id", event.id)
        .order("rank", { ascending: true })
        .limit(50),
      supabase
        .from("v_leaderboard_teams")
        .select("slug, name, photo_path, raised_cents, member_count, event_id")
        .eq("event_id", event.id)
        .order("rank", { ascending: true })
        .limit(50),
      // Header aggregates over EVERY active page, not just the displayed 50.
      supabase
        .from("v_fundraiser_totals")
        .select("raised_cents")
        .eq("event_id", event.id),
    ]);
    const totalsRows = (allTotals ?? []) as { raised_cents: number }[];
    return {
      event,
      eventSlug: chosen.slug,
      options,
      individuals: (individuals ?? []) as IndividualRow[],
      teams: (teams ?? []) as TeamRow[],
      activeCount: totalsRows.length,
      totalRaised: totalsRows.reduce((sum, row) => sum + row.raised_cents, 0),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: `${t("fundraisers")} — Santamore` };
}

export default async function FundraisersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dogadjaj?: string }>;
}) {
  const [{ locale }, { dogadjaj }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");

  const board = await fetchBoard(dogadjaj);
  const totalRaised = board?.totalRaised ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-black/60">
        {board?.event.name ?? "Santamore"}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="type-display text-4xl">{t("fundraisersTitle")}</h1>
        <Link
          href={board ? `/dashboard/prikupljaj?event=${board.eventSlug}` : "/dashboard/prikupljaj"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2.5 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark"
        >
          <span aria-hidden className="text-[18px] leading-none">+</span>
          {t("startFundraisingCta")}
        </Link>
      </div>
      {board && board.options.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={t("pickEvent")}>
          {board.options.map((option) => (
            <Link
              key={option.slug}
              href={`/prikupljaci?dogadjaj=${option.slug}`}
              aria-current={option.slug === board.eventSlug ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${
                option.slug === board.eventSlug ? "bg-ink text-paper" : "bg-mist hover:bg-mist-2"
              }`}
            >
              {option.name}
              {option.pages > 0 ? <span className="ml-1.5 font-mono text-[12px] tabular-nums opacity-70">{option.pages}</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[14.5px] text-black/65">
        <span className="font-mono tabular-nums">{board?.activeCount ?? 0}</span>{" "}
        {t("activeFundraisers")} ·{" "}
        <span className="font-mono tabular-nums">
          {formatCents(totalRaised, locale as Locale, { trimWholeCents: true })}
        </span>
      </p>

      <FundraisersBrowser
        individuals={
          board?.individuals.map(
            (row): LeaderboardEntry => ({
              slug: row.slug,
              title: row.title,
              photoUrl: fundraiserPhotoUrl(row.photo_path),
              raisedCents: row.raised_cents,
              href: `/f/${row.slug}`,
            }),
          ) ?? []
        }
        teams={
          board?.teams.map(
            (row): LeaderboardEntry => ({
              slug: row.slug,
              title: row.name,
              photoUrl: fundraiserPhotoUrl(row.photo_path),
              raisedCents: row.raised_cents,
              meta: t("memberCount", { count: row.member_count }),
              href: `/t/${row.slug}`,
            }),
          ) ?? []
        }
      />
    </div>
  );
}
