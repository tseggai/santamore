import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Leaderboard, type LeaderboardEntry } from "@/components/Leaderboard";
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

async function fetchBoard() {
  try {
    const supabase = await createClient();
    // The next upcoming published event (falling back to the latest past
    // one); the event page (Task 6) will scope by slug.
    const { data: upcoming } = await supabase
      .from("v_public_events")
      .select("id, name")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1);
    const { data: fallback } = upcoming?.length
      ? { data: upcoming }
      : await supabase
          .from("v_public_events")
          .select("id, name")
          .order("starts_at", { ascending: false })
          .limit(1);
    const event = (fallback?.[0] ?? null) as EventRow | null;
    if (!event) return null;

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");

  const board = await fetchBoard();
  const totalRaised = board?.totalRaised ?? 0;

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink/60">
        {board?.event.name ?? "Santamore"}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="type-display text-3xl">{t("title")}</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl bg-red px-4 py-2.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          <span aria-hidden className="text-[18px] leading-none">+</span>
          {t("myPageCta")}
        </Link>
      </div>
      <p className="mt-2 text-[14.5px] text-ink/65">
        <span className="font-mono tabular-nums">{board?.activeCount ?? 0}</span>{" "}
        {t("activeFundraisers")} ·{" "}
        <span className="font-mono tabular-nums">
          {formatCents(totalRaised, locale as Locale, { trimWholeCents: true })}
        </span>
      </p>

      <Leaderboard
        locale={locale as Locale}
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
