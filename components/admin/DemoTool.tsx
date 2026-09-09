"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import {
  generateDemoData,
  purgeDemoData,
  type DemoResult,
} from "@/app/[locale]/admin/(protected)/demo/actions";

const inputClass =
  "mt-1 w-full rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5 font-mono text-[14px] tabular-nums outline-none focus:border-sea";

export function DemoTool({
  counts,
}: {
  counts: { users: number; teams: number; fundraisers: number; donations: number };
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [teams, setTeams] = useState("5");
  const [perTeam, setPerTeam] = useState("4");
  const [maxDonations, setMaxDonations] = useState("6");
  const [busy, setBusy] = useState<"" | "generate" | "purge">("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("generate");
    setResult(null);
    const outcome = await generateDemoData({
      teams: Number(teams),
      perTeam: Number(perTeam),
      maxDonations: Number(maxDonations),
    }).catch(() => ({ ok: false as const, error: "server" as const }));
    setBusy("");
    setResult(outcome);
    router.refresh();
  };

  const purge = async () => {
    setBusy("purge");
    setResult(null);
    const outcome = await purgeDemoData().catch(() => ({
      ok: false as const,
      error: "server" as const,
    }));
    setBusy("");
    setConfirmPurge(false);
    setResult(outcome);
    router.refresh();
  };

  const hasDemo = counts.users + counts.teams + counts.fundraisers + counts.donations > 0;

  return (
    <div className="mt-5 space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["demoUsers", counts.users],
            ["demoTeams", counts.teams],
            ["demoFundraisers", counts.fundraisers],
            ["demoDonations", counts.donations],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-brand border-[1.5px] border-line-soft bg-mist/50 px-4 py-3">
            <p className="font-mono text-2xl tabular-nums">{value}</p>
            <p className="mt-0.5 text-[12px] font-semibold text-ink/60">{t(key)}</p>
          </div>
        ))}
      </div>

      <form onSubmit={generate} className="rounded-brand border-[1.5px] border-line p-4 sm:p-5">
        <h2 className="text-[15px] font-bold">{t("demoGenerateHeading")}</h2>
        <p className="mt-1 text-[13px] text-ink/60">{t("demoGenerateHint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="demoTeams" className="text-[12.5px] font-semibold">
              {t("demoTeamsLabel")}
            </label>
            <input
              id="demoTeams"
              type="number"
              min={1}
              max={10}
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="demoPerTeam" className="text-[12.5px] font-semibold">
              {t("demoPerTeamLabel")}
            </label>
            <input
              id="demoPerTeam"
              type="number"
              min={1}
              max={8}
              value={perTeam}
              onChange={(e) => setPerTeam(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="demoDonations" className="text-[12.5px] font-semibold">
              {t("demoDonationsLabel")}
            </label>
            <input
              id="demoDonations"
              type="number"
              min={0}
              max={15}
              value={maxDonations}
              onChange={(e) => setMaxDonations(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy !== ""}
          className="mt-4 rounded-xl bg-red px-5 py-2.5 text-[13.5px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
        >
          {busy === "generate" ? t("demoGenerating") : t("demoGenerate")}
        </button>
      </form>

      <div className="rounded-brand border-[1.5px] border-dashed border-red bg-red/5 p-4 sm:p-5">
        <h2 className="text-[15px] font-bold text-red-dark">{t("demoPurgeHeading")}</h2>
        <p className="mt-1 text-[13px] text-ink/70">{t("demoPurgeHint")}</p>
        {confirmPurge ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy !== ""}
              onClick={purge}
              className="rounded-xl bg-red-dark px-5 py-2.5 text-[13.5px] font-bold text-paper disabled:opacity-60"
            >
              {busy === "purge" ? t("demoPurging") : t("demoPurgeConfirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmPurge(false)}
              className="rounded-xl border-[1.5px] border-line px-4 py-2.5 text-[13.5px] font-semibold"
            >
              {t("cancel")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy !== "" || !hasDemo}
            onClick={() => setConfirmPurge(true)}
            className="mt-3 rounded-xl border-[1.5px] border-red px-5 py-2.5 text-[13.5px] font-bold text-red-dark transition-colors hover:bg-red hover:text-paper disabled:opacity-40"
          >
            {t("demoPurge")}
          </button>
        )}
      </div>

      {result ? (
        result.ok ? (
          <p className="text-[13.5px] font-semibold text-sea" role="status">
            {result.created
              ? t("demoCreated", result.created)
              : t("demoPurged", { count: result.purged?.users ?? 0 })}
          </p>
        ) : (
          <p role="alert" className="text-[13.5px] font-semibold text-red-dark">
            {result.error === "no_event" ? t("demoNoEvent") : t("actionError")}
            {result.created && result.created.users > 0
              ? ` ${t("demoPartial", result.created)}`
              : null}
          </p>
        )
      ) : null}
    </div>
  );
}
