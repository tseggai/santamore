import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { EventChoice } from "@/components/dashboard/CreatePageForm";
import { PagesHub, type HubPage } from "@/components/dashboard/PagesHub";
import type { MyTeam, TeamEventChoice } from "@/components/dashboard/TeamsManager";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "active" | "hidden";
  goal_cents: number | null;
  photo_path: string | null;
  campaign_id: string | null;
  team_id: string | null;
}

interface CauseRow {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
}

interface TotalsRow {
  slug: string;
  raised_cents: number;
  donor_count: number;
}

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  photo_path: string | null;
  campaign_id: string | null;
  campaign_title: string | null;
  member_count: number;
  raised_cents: number;
}

/**
 * The hub of the runner console: every page they hold — with its total,
 * team, share button and editor — the teams they captain, and the way to
 * start another page. `?event=` preselects an event to create for,
 * `?team=` (from "Join this team") goes straight to the editor of the
 * runner's page on that team's event, or to creating one.
 */
export default async function PagesHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string; cause?: string; team?: string; stranica?: string; have?: string }>;
}) {
  const [{ locale }, { event: eventParam, cause: causeParam, team: teamParam, stranica, have }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: pageRows }, { data: causeRows }, { data: profile }, { data: captained }, { data: eventForParam }] =
    await Promise.all([
      supabase
        .from("fundraisers")
        .select("id, slug, title, status, goal_cents, photo_path, campaign_id, team_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("v_public_campaigns")
        .select("id, slug, title, starts_at, ends_at")
        .order("starts_at", { ascending: false }),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase.from("teams").select("id").eq("captain_id", user.id),
      // "?event=" from an event page: raise for that event's cause.
      eventParam
        ? supabase.from("v_public_events").select("campaign_slug").eq("slug", eventParam).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const pages = (pageRows ?? []) as PageRow[];
  const causes = (causeRows ?? []) as CauseRow[];
  const wantedCause = causeParam ?? eventForParam?.campaign_slug ?? null;

  // "Join this team": resolve the team's cause and route to that page.
  let teamEventSlug: string | null = null;
  if (teamParam && UUID.test(teamParam)) {
    const { data: team } = await supabase
      .from("v_team_totals")
      .select("id, campaign_id")
      .eq("id", teamParam)
      .maybeSingle();
    if (team) {
      const existing = pages.find((page) => page.campaign_id === team.campaign_id);
      if (existing) {
        redirect(`/${locale}/dashboard/stranice?stranica=${existing.slug}&team=${teamParam}`);
      }
      teamEventSlug = causes.find((cause) => cause.id === team.campaign_id)?.slug ?? null;
    }
  }

  const teamIds = [
    ...new Set([
      ...(captained ?? []).map((row) => row.id),
      ...pages.flatMap((page) => (page.team_id ? [page.team_id] : [])),
    ]),
  ];
  const [{ data: totalsRows }, { data: teamRows }] = await Promise.all([
    pages.length
      ? supabase
          .from("v_fundraiser_totals")
          .select("slug, raised_cents, donor_count")
          .in("slug", pages.map((page) => page.slug))
      : Promise.resolve({ data: [] as TotalsRow[] }),
    teamIds.length
      ? supabase
          .from("v_team_totals")
          .select("id, slug, name, description, photo_path, campaign_id, campaign_title, member_count, raised_cents")
          .in("id", teamIds)
          .order("name")
      : Promise.resolve({ data: [] as TeamRow[] }),
  ]);
  const totalsBySlug = new Map(((totalsRows ?? []) as TotalsRow[]).map((row) => [row.slug, row]));
  const teamById = new Map(((teamRows ?? []) as TeamRow[]).map((row) => [row.id, row]));
  const captainIds = new Set((captained ?? []).map((row) => row.id));

  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });
  const now = Date.now();
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const haveCause = new Set(pages.map((page) => page.campaign_id));
  const openCauses = causes.filter((cause) => !cause.ends_at || new Date(cause.ends_at).getTime() >= now);
  // Every open cause is offered; the ones this runner already raises for
  // are shown but cannot be picked twice.
  const choices = openCauses.map(
    (cause): EventChoice => ({
      slug: cause.slug,
      name: cause.title,
      dateLabel: cause.ends_at ? dateFormat.format(new Date(cause.ends_at)) : "",
      taken: haveCause.has(cause.id),
    }),
  );
  const causeById = new Map(causes.map((cause) => [cause.id, cause]));

  const myTeams: MyTeam[] = ((teamRows ?? []) as TeamRow[])
    .filter((team) => captainIds.has(team.id))
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      description: team.description,
      photoPath: team.photo_path,
      causeId: team.campaign_id ?? "",
      causeName: team.campaign_title ?? "—",
      memberCount: team.member_count,
      raisedLabel: money(team.raised_cents),
    }));
  const pageByCause = new Map(pages.map((page) => [page.campaign_id, page.id]));
  const teamEventChoices: TeamEventChoice[] = openCauses.map((cause) => ({
    id: cause.id,
    name: cause.title,
    fundraiserId: pageByCause.get(cause.id) ?? null,
  }));

  const hubPages: HubPage[] = pages.map((page) => {
    const cause = page.campaign_id ? causeById.get(page.campaign_id) : undefined;
    const totals = totalsBySlug.get(page.slug);
    const team = page.team_id ? teamById.get(page.team_id) : null;
    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      goalCents: page.goal_cents,
      photoPath: page.photo_path,
      causeName: cause?.title ?? "—",
      causeSlug: cause?.slug ?? null,
      teamName: team?.name ?? null,
      teamSlug: team?.slug ?? null,
      raisedCents: totals?.raised_cents ?? 0,
      donorCount: totals?.donor_count ?? 0,
    };
  });

  return (
    <div className="py-8">
      <PagesHub
        title={t("navPages")}
        lead={pages.length === 0 ? t("hubEmptySub") : t("pagesSub")}
        pages={hubPages}
        teams={myTeams}
        teamEvents={teamEventChoices}
        choices={choices}
        defaultName={profile?.full_name ?? ""}
        initialOpen={stranica}
        havePage={have ? (hubPages.find((page) => page.slug === have) ?? null) : null}
        openCreate={choices.some((choice) => choice.slug === (teamEventSlug ?? wantedCause) && !choice.taken)}
        defaultEventSlug={teamEventSlug ?? wantedCause}
        joinTeamId={teamParam && UUID.test(teamParam) ? teamParam : null}
      />
    </div>
  );
}
