"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  deleteActivity,
  logActivity,
} from "@/app/[locale]/dashboard/(protected)/actions";
import { formatMetricValue, type ChallengeMetric } from "@/lib/metrics";
import type { Locale } from "@/i18n/routing";

export interface ActivityEntry {
  id: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  source: string;
}

/** Manual activity logging for challenge events, plus the running total. */
export function ActivityLog({
  fundraiserId,
  metric,
  activities,
  surface = "mist",
}: {
  fundraiserId: string;
  metric: ChallengeMetric;
  activities: ActivityEntry[];
  /** "paper" inside the hub's slide-over, which is mist itself. */
  surface?: "mist" | "paper";
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [km, setKm] = useState("");
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const totals = {
    distance_m: activities.reduce((sum, a) => sum + a.distance_m, 0),
    moving_time_s: activities.reduce((sum, a) => sum + a.moving_time_s, 0),
    activity_count: activities.length,
    elevation_m: 0,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await logActivity({ km, minutes, date, fundraiserId }).catch(() => ({
      ok: false,
    }));
    if (result.ok) {
      setKm("");
      setMinutes("");
      setState("idle");
      router.refresh();
    } else {
      setState("error");
    }
  };

  const remove = async (id: string) => {
    await deleteActivity({ id }).catch(() => null);
    router.refresh();
  };

  const inputClass =
    "mt-1 h-11 w-full min-w-0 rounded-lg border-[1.5px] border-line bg-paper px-2 font-mono text-[15px] tabular-nums outline-none focus:border-sea";

  return (
    <div className={`mt-6 rounded-brand px-4 py-4 ${surface === "paper" ? "bg-paper" : "bg-mist"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-bold">{t("activityHeading")}</p>
        <p className="font-mono text-[16px] font-medium tabular-nums text-sea">
          {formatMetricValue(totals[metric], metric, locale)}
        </p>
      </div>
      <p className="mt-1 text-[13.5px] text-black/60">{t("activitySub")}</p>

      {/* One row on a phone: two narrow figures, the date takes what is left. */}
      <form onSubmit={submit} className="mt-3 flex items-end gap-2">
        <label className="w-14 shrink-0 text-[13px] font-semibold sm:w-20">
          {t("activityKm")}
          <input
            type="text"
            inputMode="decimal"
            value={km}
            onChange={(event) => setKm(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="w-14 shrink-0 text-[13px] font-semibold sm:w-20">
          {t("activityMinutes")}
          <input
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="min-w-0 flex-1 text-[13px] font-semibold sm:max-w-[180px]">
          {t("activityDate")}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={state === "busy" || (km.trim() === "" && minutes.trim() === "")}
          className="h-11 shrink-0 rounded-lg bg-sea px-3.5 text-[14px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
        >
          {t("activitySubmit")}
        </button>
      </form>
      {state === "error" ? (
        <p role="alert" className="mt-2 text-[13.5px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}

      {activities.length > 0 ? (
        <ul className="mt-3">
          {activities.slice(0, 8).map((activity) => (
            <li
              key={activity.id}
              className="flex items-baseline justify-between gap-3 border-t-[0.5px] border-line py-2 text-[13.5px]"
            >
              <span className="font-mono tabular-nums text-black/60">
                {activity.started_at.slice(0, 10)}
              </span>
              <span className="flex-1 font-mono tabular-nums">
                {activity.distance_m > 0
                  ? formatMetricValue(activity.distance_m, "distance_m", locale)
                  : null}
                {activity.distance_m > 0 && activity.moving_time_s > 0 ? " · " : null}
                {activity.moving_time_s > 0
                  ? formatMetricValue(activity.moving_time_s, "moving_time_s", locale)
                  : null}
              </span>
              {activity.source === "manual" ? (
                <button
                  type="button"
                  onClick={() => remove(activity.id)}
                  className="text-[12.5px] font-semibold text-black/50 transition-colors hover:text-red-dark"
                >
                  {t("activityDelete")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
