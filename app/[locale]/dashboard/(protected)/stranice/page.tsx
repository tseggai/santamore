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
  event_id: string;
  team_id: string | null;
}

interface EventRow {
  id: string;
  slug: string;
  name: string;
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
  event_id: string;
  event_name: string;
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
  searchParams: Promise<{ event?: string; team?: string; stranica?: string }>;
}) {
  const [{ locale }, { event: eventParam, team: teamParam, stranica }] = await Promise.all([
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

  const [{ data: pageRows }, { data: eventRows }, { data: profile }, { data: captained }] =
    await Promise.all([
      supabase
        .from("fundraisers")
        .select("id, slug, title, status, goal_cents, photo_path, event_id, team_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("v_public_events")
        .select("id, slug, name, starts_at, ends_at")
        .order("starts_at", { ascending: true }),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase.from("teams").select("id").eq("captain_id", user.id),
    ]);
  const pages = (pageRows ?? []) as PageRow[];
  const events = (eventRows ?? []) as EventRow[];

  // "Join this team": resolve the team's event and route to that page.
  let teamEventSlug: string | null = null;
  if (teamParam && UUID.test(teamParam)) {
    const { data: team } = await supabase
      .from("v_team_totals")
      .select("id, event_id")
      .eq("id", teamParam)
      .maybeSingle();
    if (team) {
      const existing = pages.find((page) => page.event_id === team.event_id);
      if (existing) {
        redirect(`/${locale}/dashboard/stranice/${existing.slug}?team=${teamParam}`);
      }
      teamEventSlug = events.find((event) => event.id === team.event_id)?.slug ?? null;
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
          .select("id, slug, name, description, photo_path, event_id, event_name, member_count, raised_cents")
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
  const haveEvent = new Set(pages.map((page) => page.event_id));
  const openEvents = events.filter((event) => {
    const end = event.ends_at ?? event.starts_at;
    return !end || new Date(end).getTime() >= now;
  });
  const choices = openEvents
    .filter((event) => !haveEvent.has(event.id))
    .map(
      (event): EventChoice => ({
        slug: event.slug,
        name: event.name,
        dateLabel: event.starts_at ? dateFormat.format(new Date(event.starts_at)) : "",
      }),
    );
  const eventById = new Map(events.map((event) => [event.id, event]));

  const myTeams: MyTeam[] = ((teamRows ?? []) as TeamRow[])
    .filter((team) => captainIds.has(team.id))
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      description: team.description,
      photoPath: team.photo_path,
      eventId: team.event_id,
      eventName: team.event_name,
      memberCount: team.member_count,
      raisedLabel: money(team.raised_cents),
    }));
  const pageByEvent = new Map(pages.map((page) => [page.event_id, page.id]));
  const teamEventChoices: TeamEventChoice[] = openEvents.map((event) => ({
    id: event.id,
    name: event.name,
    fundraiserId: pageByEvent.get(event.id) ?? null,
  }));

  const hubPages: HubPage[] = pages.map((page) => {
    const event = eventById.get(page.event_id);
    const totals = totalsBySlug.get(page.slug);
    const team = page.team_id ? teamById.get(page.team_id) : null;
    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      goalCents: page.goal_cents,
      photoPath: page.photo_path,
      eventName: event?.name ?? "—",
      eventDate: event?.starts_at ? dateFormat.format(new Date(event.starts_at)) : "",
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
        openCreate={choices.some((choice) => choice.slug === (teamEventSlug ?? eventParam))}
        defaultEventSlug={teamEventSlug ?? eventParam ?? null}
        joinTeamId={teamParam && UUID.test(teamParam) ? teamParam : null}
      />
    </div>
  );
}
