import { getTranslations, setRequestLocale } from "next-intl/server";

import { formatMetricValue } from "@/lib/metrics";
import { localToday } from "@/lib/strava/sync";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface AthleteRow {
  user_id: string;
  athlete_id: number;
  scope: string;
  share_public: boolean;
  connected_at: string;
  last_sync_at: string | null;
  full_name: string | null;
  email: string | null;
  activities_total: number;
  activities_30d: number;
  distance_30d_m: number;
  last_activity_on: string | null;
  awards_total: number;
  awards_redeemed: number;
  pages: number;
}

/**
 * Who has connected Strava and how active they are — aggregates only
 * (counts, distance), never the runs themselves. Answers "how many of our
 * ten athlete slots are used" and "who has gone quiet".
 */
export default async function AdminAthletesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_staff_athletes")
    .select("*")
    .order("last_activity_on", { ascending: false, nullsFirst: false });
  const athletes = (data ?? []) as AthleteRow[];

  const today = localToday();
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekAgoIso = weekAgo.toISOString().slice(0, 10);
  const km = (m: number) => formatMetricValue(m, "distance_m", locale as Locale);

  const tiles = [
    { label: t("athTileConnected"), value: String(athletes.length) },
    {
      label: t("athTileActive"),
      value: String(athletes.filter((a) => a.last_activity_on && a.last_activity_on >= weekAgoIso).length),
    },
    { label: t("athTileActivities"), value: String(athletes.reduce((n, a) => n + a.activities_30d, 0)) },
    { label: t("athTileKm"), value: km(athletes.reduce((n, a) => n + a.distance_30d_m, 0)) },
    { label: t("athTileAwards"), value: String(athletes.reduce((n, a) => n + a.awards_total, 0)) },
  ];

  const th = "px-3 py-2 text-left font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-ink/60";
  const td = "px-3 py-2.5 align-top";

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("athletesTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink/60">{t("athletesHint")}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-brand border-[1.5px] border-line-soft bg-mist/50 px-4 py-3">
            <p className="text-[12px] font-semibold text-ink/60">{tile.label}</p>
            <p className="mt-1 font-mono text-xl tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {athletes.length === 0 ? (
        <p className="mt-6 text-[13.5px] text-ink/60">{t("athletesEmpty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-brand border-[1.5px] border-line">
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead className="bg-mist/60">
              <tr>
                <th className={th}>{t("athName")}</th>
                <th className={th}>{t("athConnected")}</th>
                <th className={th}>{t("athLastSync")}</th>
                <th className={th}>{t("athLastRun")}</th>
                <th className={`${th} text-right`}>{t("ath30d")}</th>
                <th className={`${th} text-right`}>{t("athAwards")}</th>
                <th className={`${th} text-right`}>{t("athPages")}</th>
                <th className={th}>{t("athFlags")}</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.user_id} className="border-t border-line-soft">
                  <td className={td}>
                    <span className="block font-semibold">{a.full_name?.trim() || a.email || a.user_id.slice(0, 8)}</span>
                    {a.full_name?.trim() && a.email ? (
                      <span className="block text-[12px] text-ink/55">{a.email}</span>
                    ) : null}
                    <a
                      href={`https://www.strava.com/athletes/${a.athlete_id}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[12px] font-semibold text-[#FC5200] underline underline-offset-2"
                    >
                      {t("athViewOnStrava")}
                    </a>
                  </td>
                  <td className={`${td} font-mono tabular-nums text-ink/70`}>{a.connected_at.slice(0, 10)}</td>
                  <td className={`${td} font-mono tabular-nums text-ink/70`}>
                    {a.last_sync_at ? a.last_sync_at.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className={`${td} font-mono tabular-nums text-ink/70`}>{a.last_activity_on ?? "—"}</td>
                  <td className={`${td} text-right font-mono tabular-nums`}>
                    {a.activities_30d} · {km(a.distance_30d_m)}
                    <span className="block text-[11.5px] text-ink/50">
                      {t("athTotal", { n: a.activities_total })}
                    </span>
                  </td>
                  <td className={`${td} text-right font-mono tabular-nums`}>
                    {a.awards_total}
                    <span className="block text-[11.5px] text-ink/50">
                      {t("athRedeemed", { n: a.awards_redeemed })}
                    </span>
                  </td>
                  <td className={`${td} text-right font-mono tabular-nums`}>{a.pages}</td>
                  <td className={td}>
                    <span className="flex flex-wrap gap-1">
                      {a.share_public ? (
                        <span className="rounded-full bg-sea px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper">
                          {t("athPublic")}
                        </span>
                      ) : null}
                      {!a.scope.includes("activity:read_all") ? (
                        <span className="rounded-full border border-red px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-dark">
                          {t("athPublicOnly")}
                        </span>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
