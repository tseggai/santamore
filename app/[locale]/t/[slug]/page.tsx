import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { ShareButton } from "@/components/ShareButton";
import { Waterline } from "@/components/Waterline";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface TeamTotalsRow {
  id: string;
  slug: string;
  name: string;
  goal_cents: number | null;
  event_name: string;
  member_count: number;
  raised_cents: number;
  donor_count: number;
}

interface MemberRow {
  slug: string;
  title: string;
  raised_cents: number;
}

async function fetchTeam(slug: string) {
  try {
    const supabase = await createClient();
    const { data: team } = await supabase
      .from("v_team_totals")
      .select("*")
      .eq("slug", slug)
      .single();
    if (!team) return null;
    const { data: members } = await supabase
      .from("v_fundraiser_totals")
      .select("slug, title, raised_cents")
      .eq("team_slug", slug)
      .order("raised_cents", { ascending: false })
      .limit(100);
    return {
      team: team as TeamTotalsRow,
      members: (members ?? []) as MemberRow[],
    };
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
  const result = await fetchTeam(slug);
  return { title: result ? `${result.team.name} — Santamore` : "Santamore" };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tDonate] = await Promise.all([
    getTranslations("leaderboard"),
    getTranslations("donate"),
  ]);

  const result = await fetchTeam(slug);
  if (!result) notFound();
  const { team, members } = result;

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <Link
        href="/prikupljaci"
        className="inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80 transition-colors hover:text-sea"
      >
        {team.event_name}
      </Link>
      <h1 className="type-display mt-2 text-3xl">{team.name}</h1>
      <p className="mt-2 text-[13.5px] text-ink/65">
        <span className="font-mono tabular-nums">{team.member_count}</span>{" "}
        {t("teamMembers")}
      </p>

      <div className="mt-4">
        {team.goal_cents && team.goal_cents > 0 ? (
          <Waterline
            raisedCents={team.raised_cents}
            goalCents={team.goal_cents}
            donorCount={team.donor_count}
            locale={locale as Locale}
          />
        ) : (
          <p className="rounded-brand border-[1.5px] border-ink bg-mist px-5 py-4">
            <span className="type-display block text-3xl tabular-nums">
              {formatCents(team.raised_cents, locale as Locale, { trimWholeCents: true })}
            </span>
          </p>
        )}
      </div>

      <div className="mt-4">
        <ShareButton
          title={team.name}
          path={`/${locale}/t/${team.slug}`}
          label={t("shareTeam")}
          copiedLabel={tDonate("copied")}
          variant="ghost"
        />
      </div>

      <div className="my-5 h-px bg-line-soft" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sea/80">
        {t("teamMembers")}
      </p>
      <LeaderboardList
        locale={locale as Locale}
        entries={members.map(
          (member): LeaderboardEntry => ({
            slug: member.slug,
            title: member.title,
            raisedCents: member.raised_cents,
            href: `/f/${member.slug}`,
          }),
        )}
      />
    </div>
  );
}
