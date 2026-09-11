import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Avatar } from "@/components/Avatar";
import { DonateButton } from "@/components/donate/DonateButton";
import { formatCents } from "@/lib/money";
import { fundraiserPhotoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

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

interface TotalsRow {
  slug: string;
  raised_cents: number;
  donor_count: number;
}

/**
 * The runner's overview: the numbers that matter across every page they
 * hold, the one next move, and quick actions. Everything reads under the
 * runner's own session (owner policies) except public totals, which come
 * from the public views.
 */
export default async function DashboardOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [
    { data: pageRows },
    { data: teamRows },
    { data: regRows },
    { data: awardRows },
    { data: connection },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("fundraisers")
      .select("id, slug, title, status, goal_cents, photo_path, event_id, team_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("teams").select("id, name, slug, event_id").eq("captain_id", user.id),
    supabase.from("registrations").select("id, event_id, status").eq("user_id", user.id),
    supabase.from("perk_awards").select("code, status").eq("user_id", user.id),
    supabase.from("strava_connections").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const pages = (pageRows ?? []) as PageRow[];

  const eventIds = [
    ...new Set([
      ...pages.map((page) => page.event_id),
      ...(teamRows ?? []).map((team) => team.event_id),
      ...(regRows ?? []).map((registration) => registration.event_id),
    ]),
  ];
  const [{ data: events }, { data: totalsRows }] = await Promise.all([
    eventIds.length
      ? supabase.from("v_public_events").select("id, slug, name, starts_at, kind").in("id", eventIds)
      : Promise.resolve({ data: [] as { id: string; slug: string; name: string; starts_at: string | null; kind: string }[] }),
    pages.length
      ? supabase
          .from("v_fundraiser_totals")
          .select("slug, raised_cents, donor_count")
          .in(
            "slug",
            pages.map((page) => page.slug),
          )
      : Promise.resolve({ data: [] as TotalsRow[] }),
  ]);
  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const totalsBySlug = new Map(((totalsRows ?? []) as TotalsRow[]).map((row) => [row.slug, row]));

  const raised = pages.reduce((sum, page) => sum + (totalsBySlug.get(page.slug)?.raised_cents ?? 0), 0);
  const donors = pages.reduce((sum, page) => sum + (totalsBySlug.get(page.slug)?.donor_count ?? 0), 0);
  const goal = pages.reduce((sum, page) => sum + (page.goal_cents ?? 0), 0);
  const rewardsReady = (awardRows ?? []).filter((award) => award.status === "issued").length;
  const drafts = pages.filter((page) => page.status !== "active");

  const now = Date.now();
  const nextEvent = (events ?? [])
    .filter((event) => event.starts_at && new Date(event.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())[0];
  const daysLeft = nextEvent?.starts_at
    ? Math.max(0, Math.ceil((new Date(nextEvent.starts_at).getTime() - now) / 86_400_000))
    : null;

  const money = (cents: number) => formatCents(cents, locale as Locale, { trimWholeCents: true });
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "short",
  });

  // The one next move (brief §10 nudge treatment).
  const nextAction =
    pages.length === 0
      ? { text: t("nextActionCreate"), href: "/dashboard/stranice", donateSlug: null }
      : drafts.length > 0
        ? { text: t("nextActionPublish"), href: `/dashboard/stranice/${drafts[0].slug}`, donateSlug: null }
        : raised === 0
          ? { text: t("nextActionSelf"), href: `/f/${pages[0].slug}/podrzi`, donateSlug: pages[0].slug }
          : { text: t("nudgeShare"), href: "/dashboard/stranice", donateSlug: null };
  const nextClass =
    "group mt-6 block rounded-lg bg-ink px-6 py-6 text-paper transition-opacity hover:opacity-95 sm:px-8 sm:py-7";
  const nextBody = (
    <>
      <span className="type-eyebrow block text-red">{t("nextHeading")}</span>
      <span className="type-display mt-2 block max-w-2xl text-xl text-paper sm:text-2xl">{nextAction.text}</span>
      <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-paper px-4 py-2 text-[15px] font-bold text-black transition-colors group-hover:bg-mist">
        {t("nextGo")} →
      </span>
    </>
  );

  const tiles = [
    { label: t("statRaised"), value: money(raised), tone: "ink" },
    { label: t("statGoal"), value: goal > 0 ? money(goal) : "—", tone: "ink" },
    { label: t("statDonors"), value: String(donors), tone: "sea" },
    { label: t("statRewards"), value: String(rewardsReady), tone: "red" },
  ] as const;

  const quickActions = [
    { href: "/dashboard/stranice", label: pages.length === 0 ? t("qaNewPage") : t("navPages") },
    { href: "/dashboard/strava", label: connection ? t("qaRewards") : t("qaStrava") },
    { href: "/dogadjaji", label: t("qaEvents") },
    { href: "/dashboard/donacije", label: t("qaGiving") },
  ];

  return (
    <div className="py-8">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-black/60">
        {t("consoleBadge")}
      </p>
      <h1 className="type-display mt-2 text-3xl">
        {t("welcome", { name: profile?.full_name?.split(" ")[0] ?? "" }).trim()}
      </h1>
      {nextEvent && daysLeft !== null ? (
        <p className="mt-1 text-[14.5px] text-black/60">
          {t("daysLeft", { count: daysLeft })} · {nextEvent.name}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-brand bg-mist px-4 py-3.5">
            <p className="text-[13px] font-semibold text-black/60">{tile.label}</p>
            <p
              className={`mt-1 font-mono text-2xl tabular-nums ${
                tile.tone === "red" ? "text-red-dark" : tile.tone === "sea" ? "text-sea" : "text-black"
              }`}
            >
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {nextAction.donateSlug ? (
        /* Donating to their own page opens the checkout here, in the console. */
        <DonateButton
          request={{ kind: "fundraiser", slug: nextAction.donateSlug }}
          href={nextAction.href}
          className={nextClass}
        >
          {nextBody}
        </DonateButton>
      ) : (
        <Link href={nextAction.href} className={nextClass}>
          {nextBody}
        </Link>
      )}

      <section className="mt-8">
        <h2 className="text-[16px] font-bold">{t("quickActions")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className="rounded-lg border-[1.5px] border-line px-4 py-2.5 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-bold">{t("navPages")}</h2>
          <Link href="/dashboard/stranice" className="text-[14px] font-semibold text-sea underline underline-offset-2">
            {t("manage")}
          </Link>
        </div>
        {pages.length === 0 ? (
          <p className="mt-2 text-[14.5px] text-black/60">{t("pagesEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pages.map((page) => {
              const totals = totalsBySlug.get(page.slug);
              const event = eventById.get(page.event_id);
              const pct =
                page.goal_cents && page.goal_cents > 0 && totals
                  ? Math.min(100, Math.round((totals.raised_cents / page.goal_cents) * 100))
                  : 0;
              return (
                <li key={page.id}>
                  <Link
                    href={`/dashboard/stranice/${page.slug}`}
                    className="flex items-center gap-3 rounded-lg bg-mist px-4 py-3 transition-colors hover:bg-mist-2"
                  >
                    <Avatar src={fundraiserPhotoUrl(page.photo_path)} name={page.title} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                        {page.title}
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                            page.status === "active" ? "bg-sea text-paper" : "border border-line text-black/60"
                          }`}
                        >
                          {page.status === "active" ? t("statusActiveShort") : t("statusDraftShort")}
                        </span>
                      </span>
                      <span className="block text-[13.5px] text-black/60">
                        {event?.name ?? "—"}
                        {event?.starts_at ? ` · ${dateFormat.format(new Date(event.starts_at))}` : ""}
                      </span>
                      <span className="mt-1.5 block h-[5px] overflow-hidden rounded-[3px] bg-line-soft">
                        <span className="block h-full rounded-[3px] bg-sea" style={{ width: `${Math.max(2, pct)}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-[14px] tabular-nums">
                      {money(totals?.raised_cents ?? 0)}
                      {page.goal_cents ? (
                        <span className="block text-[12px] text-black/50">/ {money(page.goal_cents)}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[16px] font-bold">{t("navTeams")}</h2>
            <Link href="/dashboard/stranice#timovi" className="text-[14px] font-semibold text-sea underline underline-offset-2">
              {t("manage")}
            </Link>
          </div>
          {(teamRows ?? []).length === 0 ? (
            <p className="mt-2 text-[14.5px] text-black/60">{t("teamsEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(teamRows ?? []).map((team) => (
                <li key={team.id} className="text-[14.5px]">
                  <Link href={`/t/${team.slug}`} className="font-semibold hover:text-sea">
                    {team.name}
                  </Link>
                  <span className="text-black/50"> · {eventById.get(team.event_id)?.name ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="text-[16px] font-bold">{t("registrationsHeading")}</h2>
          {(regRows ?? []).length === 0 ? (
            <p className="mt-2 text-[14.5px] text-black/60">
              {t("registrationsEmpty")}{" "}
              <Link href="/dogadjaji" className="font-semibold text-sea underline underline-offset-2">
                {t("qaEvents")}
              </Link>
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {(regRows ?? []).map((registration) => {
                const event = eventById.get(registration.event_id);
                return (
                  <li key={registration.id} className="flex items-baseline justify-between gap-3 text-[14.5px]">
                    {event ? (
                      <Link href={`/dogadjaji/${event.slug}/prijava`} className="font-semibold hover:text-sea">
                        {event.name}
                      </Link>
                    ) : (
                      <span>—</span>
                    )}
                    <span className={registration.status === "confirmed" ? "text-sea" : "text-black/55"}>
                      {registration.status === "confirmed" ? t("regConfirmed") : t("regPending")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
