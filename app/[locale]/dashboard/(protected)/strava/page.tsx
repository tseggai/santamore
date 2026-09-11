import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Expandable } from "@/components/dashboard/Expandable";
import { PerkProgressList, type PerkProgressRow } from "@/components/dashboard/PerkProgressList";
import { StravaPanel, type ConnectionInfo } from "@/components/dashboard/StravaPanel";
import { WeeklyKmChart } from "@/components/dashboard/WeeklyKmChart";
import { stravaConfig } from "@/lib/strava/api";
import { localToday, syncIfStale } from "@/lib/strava/sync";
import { weeklyTotals } from "@/lib/strava/weeks";
import { formatMetricValue } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface AwardRow {
  code: string;
  status: "issued" | "redeemed" | "revoked" | "expired";
  awarded_on: string;
  expires_at: string;
  challenge_title: string;
  partner_name: string;
  reward_label: string;
}

interface ActivityRow {
  id: string;
  external_id: string | null;
  name: string | null;
  sport_type: string | null;
  started_on: string;
  distance_m: number;
  moving_time_s: number;
  is_manual: boolean;
}

const WEEKS = 8;
const RECENT_LIMIT = 8;
const REWARD_LIMIT = 5;
const CHALLENGE_LIMIT = 4;

function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The athlete's Strava dashboard: the numbers first (this week, the month,
 * rewards waiting), the weekly trend, then progress on every partner
 * challenge, rewards ready to redeem, and the runs themselves. The
 * connection is a status strip, not the subject. Everything here is the
 * athlete's own data — the only place Strava data appears without consent
 * (API Agreement §2.3). Lists cap and expand, so one run and three hundred
 * get the same page.
 */
export default async function StravaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ strava?: string }>;
}) {
  const [{ locale }, { strava: status }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("strava");
  const loc = locale as Locale;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const today = localToday();
  const monthFrom = shiftDay(today, -29);
  const trendFrom = shiftDay(today, -7 * WEEKS);

  // Fresh numbers on open: a background sync when the last one is old.
  const { data: meta } = await supabase
    .from("strava_connections")
    .select("last_sync_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (meta) await syncIfStale(user.id, meta.last_sync_at);

  const [
    { data: connectionRow },
    { data: awardRows },
    { data: activityRows },
    { data: profile },
    { data: progressRows },
    { count: pageCount },
  ] = await Promise.all([
    supabase
      .from("strava_connections")
      .select("athlete_id, share_public, connected_at, last_sync_at, scope, athlete_name, athlete_avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("perk_awards")
      .select("code")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false })
      .limit(200),
    supabase
      .from("activities")
      .select("id, external_id, name, sport_type, started_on, distance_m, moving_time_s, is_manual")
      .eq("user_id", user.id)
      .eq("source", "strava")
      .gte("started_on", trendFrom)
      .order("started_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_perk_progress"),
    supabase.from("fundraisers").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const codes = (awardRows ?? []).map((row) => row.code);
  const { data: awardDetails } = codes.length
    ? await supabase.from("v_public_perk_award").select("*").in("code", codes)
    : { data: [] };
  const awards = (awardDetails ?? []) as AwardRow[];
  awards.sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code));
  const ready = awards.filter((award) => award.status === "issued");
  const past = awards.filter((award) => award.status !== "issued");

  const activities = (activityRows ?? []) as ActivityRow[];
  const progress = (progressRows ?? []) as PerkProgressRow[];
  const connection: ConnectionInfo | null = connectionRow
    ? {
        athleteId: connectionRow.athlete_id,
        sharePublic: connectionRow.share_public,
        connectedAt: connectionRow.connected_at,
        lastSyncAt: connectionRow.last_sync_at,
        scope: connectionRow.scope ?? "",
        athleteName: connectionRow.athlete_name ?? null,
        avatarUrl: connectionRow.athlete_avatar_url ?? null,
      }
    : null;

  // Numbers
  const weeks = weeklyTotals(activities, today, WEEKS);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const month = activities.filter((a) => a.started_on >= monthFrom);
  const monthKm = month.reduce((sum, a) => sum + a.distance_m, 0);
  const longest = month.reduce((best, a) => Math.max(best, a.distance_m), 0);
  const km = (m: number) => formatMetricValue(m, "distance_m", loc);
  const delta = thisWeek.distance_m - lastWeek.distance_m;
  const shortDate = new Intl.DateTimeFormat(htmlLang(loc), { day: "numeric", month: "short" });
  const weekLabel = (weekStart: string) => shortDate.format(new Date(`${weekStart}T00:00:00Z`));

  const tiles = [
    {
      label: t("statThisWeek"),
      value: km(thisWeek.distance_m),
      sub:
        lastWeek.distance_m > 0 || thisWeek.distance_m > 0
          ? t("statVsLastWeek", { delta: `${delta >= 0 ? "+" : "−"}${km(Math.abs(delta))}` })
          : t("statNoRunsYet"),
      tone: "ink",
    },
    {
      label: t("statMonth"),
      value: km(monthKm),
      sub: t("statActivities", { count: month.length }),
      tone: "ink",
    },
    {
      label: t("statLongest"),
      value: longest > 0 ? km(longest) : "—",
      sub: t("statLongestSub"),
      tone: "sea",
    },
    {
      label: t("statRewardsReady"),
      value: String(ready.length),
      sub: t("statRewardsSub", { count: awards.length }),
      tone: ready.length > 0 ? "red" : "ink",
    },
  ] as const;

  const heading = (text: string, count?: number) => (
    <h2 className="flex items-baseline gap-2 type-eyebrow text-ink/60">
      {text}
      {count !== undefined && count > 0 ? <span className="text-ink/40">{count}</span> : null}
    </h2>
  );
  const card = "rounded-brand bg-mist p-5";

  const awardItem = (award: AwardRow) => (
    <li key={award.code}>
      <Link
        href={`/r/${award.code}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-paper px-4 py-3 transition-colors hover:bg-mist-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">
            {award.reward_label} · {award.partner_name}
          </span>
          <span className="block text-[13.5px] text-ink/60">
            {award.challenge_title} · {award.awarded_on}
            {award.status === "issued" ? ` · ${t("expiresOn", { date: award.expires_at.slice(0, 10) })}` : ""}
          </span>
        </span>
        <span className="font-mono text-[14px] tabular-nums">{award.code}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
            award.status === "issued"
              ? "bg-sea text-paper"
              : award.status === "redeemed"
                ? "bg-mist text-sea"
                : "border border-line text-ink/50"
          }`}
        >
          {t(`awardStatus.${award.status}`)}
        </span>
      </Link>
    </li>
  );

  const activityItem = (activity: ActivityRow) => (
    <li key={activity.id} className="flex items-baseline gap-3 border-t-[0.5px] border-line py-2 text-[14px]">
      <span className="font-mono tabular-nums text-ink/60">{activity.started_on}</span>
      <span className="min-w-0 flex-1 truncate">
        {activity.name ?? activity.sport_type ?? "—"}
        <span className="text-ink/50"> · {activity.sport_type}</span>
        {activity.is_manual ? <span className="text-ink/50"> · {t("manualEntry")}</span> : null}
      </span>
      <span className="font-mono tabular-nums">
        {km(activity.distance_m)}
        {activity.moving_time_s > 0 ? ` · ${formatMetricValue(activity.moving_time_s, "moving_time_s", loc)}` : null}
      </span>
      {activity.external_id ? (
        <a
          href={`https://www.strava.com/activities/${activity.external_id}`}
          target="_blank"
          rel="noopener"
          className="shrink-0 text-[13px] font-semibold text-[#FC5200] underline underline-offset-2"
        >
          {t("viewOnStrava")}
        </a>
      ) : null}
    </li>
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("title")}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{t("sub")}</p>

      <div className="mt-6 border-b-[0.5px] border-line pb-6">
        <StravaPanel
          locale={loc}
          connection={connection}
          configured={stravaConfig().configured}
          status={status ?? null}
          isStaff={profile?.role === "admin" || profile?.role === "chapter_lead"}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-brand bg-mist px-4 py-3.5">
            <p className="text-[13px] font-semibold text-ink/60">{tile.label}</p>
            <p
              className={`mt-1 font-mono text-2xl tabular-nums ${
                tile.tone === "red" ? "text-red-dark" : tile.tone === "sea" ? "text-sea" : "text-ink"
              }`}
            >
              {tile.value}
            </p>
            <p className="mt-0.5 text-[13px] text-ink/50">{tile.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className={card}>
          {heading(t("trendHeading"))}
          {activities.length === 0 ? (
            <p className="mt-2 text-[14.5px] text-ink/60">
              {connection ? t("trendEmpty") : t("trendEmptyDisconnected")}
            </p>
          ) : (
            <div className="mt-3 text-ink">
              <WeeklyKmChart
                weeks={weeks}
                weekLabel={weekLabel}
                km={km}
                caption={t("trendCaption", { weeks: WEEKS })}
              />
            </div>
          )}
        </section>

        <section className={card}>
          {heading(t("progressHeading"), progress.length)}
          {progress.length === 0 ? (
            <p className="mt-2 text-[14.5px] text-ink/60">
              {t("progressEmpty")}{" "}
              <Link href="/izazovi" className="font-semibold text-sea underline underline-offset-2">
                {t("browseChallenges")}
              </Link>
            </p>
          ) : (
            <PerkProgressList rows={progress} limit={CHALLENGE_LIMIT} />
          )}
        </section>

        <section className={card}>
          {heading(t("rewardsReadyHeading"), ready.length)}
          {ready.length === 0 ? (
            <p className="mt-2 text-[14.5px] text-ink/60">
              {awards.length === 0 ? t("awardsEmpty") : t("rewardsNoneReady")}{" "}
              {awards.length === 0 ? (
                <Link href="/izazovi" className="font-semibold text-sea underline underline-offset-2">
                  {t("browseChallenges")}
                </Link>
              ) : null}
            </p>
          ) : (
            <Expandable
              items={ready.map(awardItem)}
              limit={REWARD_LIMIT}
              moreLabel={t("showAll", { count: ready.length })}
              lessLabel={t("showLess")}
              className="mt-2 space-y-2"
            />
          )}
          {past.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-[14px] font-semibold text-ink/60 hover:text-sea">
                {t("rewardsPastHeading", { count: past.length })}
              </summary>
              <Expandable
                items={past.map(awardItem)}
                limit={REWARD_LIMIT}
                moreLabel={t("showAll", { count: past.length })}
                lessLabel={t("showLess")}
                className="mt-2 space-y-2"
              />
            </details>
          ) : null}
        </section>

        <section className={card}>
          {heading(t("activitiesHeading"), activities.length)}
          {activities.length === 0 ? (
            <p className="mt-2 text-[14.5px] text-ink/60">
              {connection ? t("activitiesEmpty") : t("activitiesEmptyDisconnected")}
            </p>
          ) : (
            <Expandable
              items={activities.map(activityItem)}
              limit={RECENT_LIMIT}
              moreLabel={t("showAll", { count: activities.length })}
              lessLabel={t("showLess")}
              className="mt-2"
            />
          )}
          <p className="mt-3 text-[13px] text-ink/50">{t("poweredBy")}</p>
        </section>
      </div>

      {connection && (pageCount ?? 0) === 0 ? (
        <div className="mt-6 rounded-brand bg-sand px-5 py-4">
          <p className="text-[15px] font-bold">{t("nurtureHeading")}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink/65">{t("nurtureBody")}</p>
          <Link
            href="/dashboard/stranice"
            className="mt-3 inline-flex rounded-lg bg-ink px-4 py-2 text-[14px] font-semibold text-paper transition-opacity hover:opacity-90"
          >
            {t("nurtureCta")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
