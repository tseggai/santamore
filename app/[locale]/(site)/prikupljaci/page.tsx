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
  campaign_id: string | null;
}
interface TeamRow {
  slug: string;
  name: string;
  photo_path: string | null;
  raised_cents: number;
  member_count: number;
  campaign_id: string | null;
}
interface EventRow {
  id: string;
  name: string;
}

interface CauseOption extends EventRow {
  slug: string;
  ends_at: string | null;
  pages: number;
}

/**
 * One board across every cause by default, ranked by what each page raised;
 * `?cilj=` narrows it to one cause. Rows carry their cause so the browser
 * can label them.
 */
async function fetchBoard(causeSlug: string | undefined) {
  try {
    const supabase = await createClient();
    const { data: causeRows } = await supabase
      .from("v_public_campaigns")
      .select("id, slug, title, ends_at, pages_raised_cents")
      .order("starts_at", { ascending: false });
    const causeList = (causeRows ?? []) as { id: string; slug: string; title: string; ends_at: string | null; pages_raised_cents: number }[];
    const options: CauseOption[] = causeList.map((c) => ({
      id: c.id,
      name: c.title,
      slug: c.slug,
      ends_at: c.ends_at,
      pages: 0,
    }));
    const chosen = causeSlug ? (options.find((c) => c.slug === causeSlug) ?? null) : null;
    let individualsQuery = supabase.from("v_leaderboard").select("slug, title, photo_path, raised_cents, campaign_id");
    let teamsQuery = supabase.from("v_leaderboard_teams").select("slug, name, photo_path, raised_cents, member_count, campaign_id");
    let totalsQuery = supabase.from("v_fundraiser_totals").select("campaign_id");
    if (chosen) {
      individualsQuery = individualsQuery.eq("campaign_id", chosen.id);
      teamsQuery = teamsQuery.eq("campaign_id", chosen.id);
      totalsQuery = totalsQuery.eq("campaign_id", chosen.id);
    }
    const [{ data: individuals }, { data: teams }, { data: allTotals }] = await Promise.all([
      individualsQuery.order("raised_cents", { ascending: false }).limit(100),
      teamsQuery.order("raised_cents", { ascending: false }).limit(100),
      // Header aggregates over EVERY active page, not just the displayed 100.
      totalsQuery,
    ]);
    const totalsRows = (allTotals ?? []) as { campaign_id: string | null }[];
    for (const row of totalsRows) {
      const option = options.find((c) => c.id === row.campaign_id);
      if (option) option.pages += 1;
    }
    return {
      event: chosen ? { id: chosen.id, name: chosen.name } : null,
      causeSlug: chosen?.slug ?? null,
      options,
      individuals: (individuals ?? []) as IndividualRow[],
      teams: (teams ?? []) as TeamRow[],
      activeCount: totalsRows.length,
      // What the pages raised: the cause view's column (migration 0062), not a sum over the board.
      totalRaised: (chosen ? causeList.filter((c) => c.id === chosen.id) : causeList).reduce((sum, c) => sum + c.pages_raised_cents, 0),
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
  searchParams: Promise<{ cilj?: string }>;
}) {
  const [{ locale }, { cilj }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");

  const board = await fetchBoard(cilj);
  const totalRaised = board?.totalRaised ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-black/60">
        {board?.event?.name ?? t("allCauses")}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="type-display text-4xl">{t("fundraisersTitle")}</h1>
        <Link
          href={board?.causeSlug ? `/dashboard/prikupljaj?cause=${board.causeSlug}` : "/dashboard/prikupljaj"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2.5 text-[15px] font-bold text-paper transition-colors hover:bg-red-dark"
        >
          <span aria-hidden className="text-[18px] leading-none">+</span>
          {t("startFundraisingCta")}
        </Link>
      </div>
      <p className="mt-2 text-[14.5px] text-black/65">
        <span className="font-mono tabular-nums">{board?.activeCount ?? 0}</span>{" "}
        {t("activeFundraisers")} ·{" "}
        <span className="font-mono tabular-nums">
          {formatCents(totalRaised, locale as Locale, { trimWholeCents: true })}
        </span>
      </p>

      <FundraisersBrowser
        causes={(board?.options ?? []).map((option) => ({ slug: option.slug, name: option.name, pages: option.pages }))}
        selectedCause={board?.causeSlug ?? null}
        individuals={
          board?.individuals.map(
            (row): LeaderboardEntry => ({
              slug: row.slug,
              title: row.title,
              photoUrl: fundraiserPhotoUrl(row.photo_path),
              raisedCents: row.raised_cents,
              meta: board.event ? undefined : (board.options.find((option) => option.id === row.campaign_id)?.name ?? undefined),
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
