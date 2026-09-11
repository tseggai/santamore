import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PerkProgressList, type PerkProgressRow } from "@/components/dashboard/PerkProgressList";
import { StravaPanel, type ConnectionInfo } from "@/components/dashboard/StravaPanel";
import { stravaConfig } from "@/lib/strava/api";
import { formatMetricValue } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface AwardRow {
  code: string;
  status: string;
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
}

/**
 * The runner's Strava page: connection, consent, manual sync, the rewards
 * they have earned (each opens its QR page) and their recent activities.
 * Everything shown here is the athlete's own data — the only place Strava
 * data appears without consent (API Agreement §2.3).
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [
    { data: connectionRow },
    { data: awardRows },
    { data: activityRows },
    { data: profile },
    { data: progressRows },
  ] =
    await Promise.all([
      supabase
        .from("strava_connections")
        .select("athlete_id, share_public, connected_at, last_sync_at, scope")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("perk_awards")
        .select("code")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false })
        .limit(50),
      supabase
        .from("activities")
        .select("id, external_id, name, sport_type, started_on, distance_m, moving_time_s")
        .eq("user_id", user.id)
        .eq("source", "strava")
        .order("started_at", { ascending: false })
        .limit(10),
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.rpc("my_perk_progress"),
    ]);
  const progress = (progressRows ?? []) as PerkProgressRow[];
  const { count: pageCount } = await supabase
    .from("fundraisers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const codes = (awardRows ?? []).map((row) => row.code);
  const { data: awardDetails } = codes.length
    ? await supabase.from("v_public_perk_award").select("*").in("code", codes)
    : { data: [] };
  const awards = (awardDetails ?? []) as AwardRow[];
  awards.sort((a, b) => codes.indexOf(a.code) - codes.indexOf(b.code));

  const connection: ConnectionInfo | null = connectionRow
    ? {
        athleteId: connectionRow.athlete_id,
        sharePublic: connectionRow.share_public,
        connectedAt: connectionRow.connected_at,
        lastSyncAt: connectionRow.last_sync_at,
        scope: connectionRow.scope ?? "",
      }
    : null;

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("title")}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink/65">{t("sub")}</p>

      <div className="mt-5">
        <StravaPanel
          locale={locale as Locale}
          connection={connection}
          configured={stravaConfig().configured}
          status={status ?? null}
          isStaff={profile?.role === "admin" || profile?.role === "chapter_lead"}
        />
      </div>

      {connection && (pageCount ?? 0) === 0 ? (
        <div className="mt-6 rounded-brand bg-[#f3f6f7] px-5 py-4">
          <p className="text-[14px] font-bold">{t("nurtureHeading")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/65">{t("nurtureBody")}</p>
          <Link
            href="/dashboard/stranice"
            className="mt-3 inline-flex rounded-xl border-[1.5px] border-ink px-4 py-2 text-[13px] font-semibold transition-colors hover:border-sea hover:text-sea"
          >
            {t("nurtureCta")}
          </Link>
        </div>
      ) : null}

      {connection ? (
        <>
          <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
            {t("progressHeading")}
          </h2>
          <PerkProgressList rows={progress} />
        </>
      ) : null}

      <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
        {t("awardsHeading")}
      </h2>
      {awards.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-ink/60">
          {t("awardsEmpty")}{" "}
          <Link href="/izazovi" className="font-semibold text-sea underline underline-offset-2">
            {t("browseChallenges")}
          </Link>
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {awards.map((award) => (
            <li key={award.code}>
              <Link
                href={`/r/${award.code}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[11px] border-[1.5px] border-line px-4 py-3 transition-colors hover:border-sea"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">
                    {award.reward_label} · {award.partner_name}
                  </span>
                  <span className="block text-[12.5px] text-ink/60">
                    {award.challenge_title} · {award.awarded_on}
                  </span>
                </span>
                <span className="font-mono text-[13px] tabular-nums">{award.code}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
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
          ))}
        </ul>
      )}

      {connection ? (
        <>
          <h2 className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
            {t("activitiesHeading")}
          </h2>
          {(activityRows ?? []).length === 0 ? (
            <p className="mt-2 text-[13.5px] text-ink/60">{t("activitiesEmpty")}</p>
          ) : (
            <ul className="mt-2">
              {((activityRows ?? []) as ActivityRow[]).map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-baseline gap-3 border-t border-line-soft py-2 text-[13px]"
                >
                  <span className="font-mono tabular-nums text-ink/60">{activity.started_on}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {activity.name ?? activity.sport_type ?? "—"}
                    <span className="text-ink/50"> · {activity.sport_type}</span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatMetricValue(activity.distance_m, "distance_m", locale as Locale)}
                    {activity.moving_time_s > 0
                      ? ` · ${formatMetricValue(activity.moving_time_s, "moving_time_s", locale as Locale)}`
                      : null}
                  </span>
                  {activity.external_id ? (
                    <a
                      href={`https://www.strava.com/activities/${activity.external_id}`}
                      target="_blank"
                      rel="noopener"
                      className="shrink-0 text-[12px] font-semibold text-[#FC5200] underline underline-offset-2"
                    >
                      {t("viewOnStrava")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[12px] text-ink/50">{t("poweredBy")}</p>
        </>
      ) : null}
    </div>
  );
}
