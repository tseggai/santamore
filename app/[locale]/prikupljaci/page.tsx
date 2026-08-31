import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Leaderboard, type LeaderboardEntry } from "@/components/Leaderboard";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface IndividualRow {
  slug: string;
  title: string;
  raised_cents: number;
  event_id: string;
}
interface TeamRow {
  slug: string;
  name: string;
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
        .select("slug, title, raised_cents, event_id")
        .eq("event_id", event.id)
        .order("rank", { ascending: true })
        .limit(50),
      supabase
        .from("v_leaderboard_teams")
        .select("slug, name, raised_cents, member_count, event_id")
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
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {board?.event.name ?? "Santamore"}
      </p>
      <h1 className="type-display mt-2 text-3xl">{t("title")}</h1>
      <p className="mt-2 text-[13.5px] text-ink/65">
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
              raisedCents: row.raised_cents,
              meta: String(row.member_count),
              href: `/t/${row.slug}`,
            }),
          ) ?? []
        }
      />

      <div className="mt-6">
        <Link
          href="/dashboard"
          className="block w-full rounded-xl bg-red px-6 py-3.5 text-center text-[15.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
        >
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
