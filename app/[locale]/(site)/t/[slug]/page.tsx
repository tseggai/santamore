import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Avatar } from "@/components/Avatar";
import { LeaderboardList, type LeaderboardEntry } from "@/components/Leaderboard";
import { ShareButton } from "@/components/ShareButton";
import { Waterline } from "@/components/Waterline";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface TeamTotalsRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  photo_path: string | null;
  goal_cents: number | null;
  event_slug: string;
  event_name: string;
  member_count: number;
  raised_cents: number;
  donor_count: number;
}

interface MemberRow {
  slug: string;
  title: string;
  photo_path: string | null;
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
      .select("slug, title, photo_path, raised_cents")
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

/**
 * Same shape as the fundraiser page so a donor never has to relearn the
 * layout: face, name, context line, actions at header level, the
 * waterline, the story, then the people — here the members' internal
 * ranking instead of the donor wall.
 */
export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tRunner, tDonate] = await Promise.all([
    getTranslations("leaderboard"),
    getTranslations("runner"),
    getTranslations("donate"),
  ]);

  const result = await fetchTeam(slug);
  if (!result) notFound();
  const { team, members } = result;
  const photo = fundraiserPhotoUrl(team.photo_path);

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
        <Avatar src={photo} name={team.name} size={136} priority className="sm:mt-1" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
            {t("teamEyebrow")}
          </p>
          <h1 className="type-display mt-1 text-3xl leading-tight sm:text-4xl">{team.name}</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink/70">
            {t("memberCount", { count: team.member_count })}
            {" · "}
            <Link
              href={`/dogadjaji/${team.event_slug}`}
              className="font-semibold text-ink underline decoration-line underline-offset-[3px] transition-colors hover:text-sea"
            >
              {team.event_name}
            </Link>
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/dashboard/stranice?team=${team.id}`}
              className="inline-flex h-11 items-center rounded-xl bg-red px-7 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark"
            >
              {t("joinTeam")}
            </Link>
            <ShareButton
              title={team.name}
              path={`/${locale}/t/${team.slug}`}
              label={t("shareTeam")}
              copiedLabel={tDonate("copied")}
              variant="icon"
            />
          </div>
        </div>
      </header>

      <div className="mt-7">
        {team.goal_cents && team.goal_cents > 0 ? (
          <Waterline
            raisedCents={team.raised_cents}
            goalCents={team.goal_cents}
            donorCount={team.donor_count}
            locale={locale as Locale}
          />
        ) : (
          <div className="rounded-brand bg-[#f3f6f7] px-5 py-5">
            <span className="type-display block text-4xl tabular-nums">
              {formatCents(team.raised_cents, locale as Locale, { trimWholeCents: true })}
            </span>
            <span className="mt-1 block text-[12.5px] text-ink/70">
              {t("teamRaisedBy", { count: team.member_count })} ·{" "}
              <span className="font-mono tabular-nums">{team.donor_count}</span>{" "}
              {tRunner("donors")}
            </span>
          </div>
        )}
      </div>

      {team.description ? (
        <>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
            {t("teamAbout")}
          </p>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/80">
            {team.description}
          </p>
        </>
      ) : null}

      <div className="my-7 h-px bg-line-soft" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
        {t("teamMembers")}
      </p>
      <p className="mt-1 text-[12.5px] text-ink/55">{t("teamMembersHint")}</p>
      <LeaderboardList
        locale={locale as Locale}
        emptyLabel={t("emptyIndividuals")}
        entries={members.map(
          (member): LeaderboardEntry => ({
            slug: member.slug,
            title: member.title,
            photoUrl: fundraiserPhotoUrl(member.photo_path),
            raisedCents: member.raised_cents,
            href: `/f/${member.slug}`,
          }),
        )}
      />
    </div>
  );
}
