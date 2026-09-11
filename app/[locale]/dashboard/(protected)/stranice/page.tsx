import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Avatar } from "@/components/Avatar";
import { CreatePageForm, type EventChoice } from "@/components/dashboard/CreatePageForm";
import {
  TeamsManager,
  type MyTeam,
  type TeamEventChoice,
} from "@/components/dashboard/TeamsManager";
import { ExternalIcon, PencilIcon } from "@/components/Icons";
import { ShareButton } from "@/components/ShareButton";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
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
  searchParams: Promise<{ event?: string; team?: string }>;
}) {
  const [{ locale }, { event: eventParam, team: teamParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);
  const [t, tDonate, tRunner] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("donate"),
    getTranslations("runner"),
  ]);

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

  const single = pages.length === 1;
  const iconBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-ink transition-colors hover:bg-mist-2 hover:text-sea";

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{single ? t("title") : t("navPages")}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/65">
        {pages.length === 0 ? t("hubEmptySub") : t("pagesSub")}
      </p>

      {pages.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {pages.map((page) => {
            const event = eventById.get(page.event_id);
            const totals = totalsBySlug.get(page.slug);
            const team = page.team_id ? teamById.get(page.team_id) : null;
            const raised = totals?.raised_cents ?? 0;
            const pct =
              page.goal_cents && page.goal_cents > 0
                ? Math.min(100, Math.round((raised / page.goal_cents) * 100))
                : 0;
            const live = page.status === "active";
            return (
              <li key={page.id} className="rounded-brand bg-mist p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Avatar src={fundraiserPhotoUrl(page.photo_path)} name={page.title} size={single ? 64 : 48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className={`font-bold ${single ? "text-[20px]" : "text-[16px]"}`}>{page.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                            live ? "bg-sea text-paper" : "bg-paper text-ink/60"
                          }`}
                        >
                          {live ? t("statusActiveShort") : t("statusDraftShort")}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/stranice/${page.slug}`}
                          aria-label={live ? t("editPage") : t("finishPage")}
                          title={live ? t("editPage") : t("finishPage")}
                          className={iconBtn}
                        >
                          <PencilIcon />
                        </Link>
                        {live ? (
                          <>
                            <ShareButton
                              title={page.title}
                              path={`/${locale}/f/${page.slug}`}
                              text={t("shareMessageShort", { title: page.title })}
                              label={tRunner("share")}
                              copiedLabel={tDonate("copied")}
                              variant="icon"
                              className={iconBtn}
                            />
                            <Link
                              href={`/f/${page.slug}`}
                              aria-label={t("viewPublic")}
                              title={t("viewPublic")}
                              className={iconBtn}
                            >
                              <ExternalIcon />
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] text-ink/60">
                      {event?.name ?? "—"}
                      {event?.starts_at ? ` · ${dateFormat.format(new Date(event.starts_at))}` : ""}
                      {team ? (
                        <>
                          {" · "}
                          <Link href={`/t/${team.slug}`} className="font-semibold text-ink/80 hover:text-sea">
                            {team.name}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[16px] tabular-nums">
                        {money(raised)}
                        {page.goal_cents ? (
                          <span className="text-[13.5px] font-medium text-ink/50"> / {money(page.goal_cents)}</span>
                        ) : null}
                      </span>
                      <span className="text-[13.5px] text-ink/55">
                        {totals?.donor_count ?? 0} {tRunner("donors")}
                        {page.goal_cents ? ` · ${pct}%` : ""}
                      </span>
                    </div>
                    <span className="mt-1.5 block h-[6px] overflow-hidden rounded-[3px] bg-mist-2">
                      <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/dashboard/stranice/${page.slug}#gotovina`}
                    className="inline-flex rounded-xl bg-ink px-4 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90"
                  >
                    {t("qaCash")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <section id="timovi" className="mt-8 scroll-mt-6 border-t-[0.5px] border-line pt-6">
        <h2 className="text-[16px] font-bold">{t("navTeams")}</h2>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink/65">{t("teamsSub")}</p>
        <TeamsManager teams={myTeams} events={teamEventChoices} />
      </section>

      <section className="mt-8 border-t-[0.5px] border-line pt-6">
        <h2 className="text-[16px] font-bold">{pages.length === 0 ? t("createHeading") : t("createAnotherHeading")}</h2>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink/65">
          {choices.length === 0 ? t("createNoEvents") : t("createSub")}
        </p>
        {choices.length > 0 ? (
          <div className="mt-4">
            <CreatePageForm
              locale={locale}
              defaultName={profile?.full_name ?? ""}
              events={choices}
              defaultEventSlug={teamEventSlug ?? eventParam ?? null}
              joinTeamId={teamParam && UUID.test(teamParam) ? teamParam : null}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
