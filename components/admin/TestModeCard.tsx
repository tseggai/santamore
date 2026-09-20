"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { purgeTestData, setTestMode } from "@/app/[locale]/admin/(protected)/podesavanja/test-actions";
import { useDialog } from "@/components/console/useDialog";

/**
 * The test-mode switch and the purge. Practise with it on; go live with
 * it off; purge when the practice is over. Only an admin gets past the
 * database, whatever this component shows.
 */
export function TestModeCard({ on, canManage }: { on: boolean; canManage: boolean }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState<"" | "toggle" | "purge">("");
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = async () => {
    if (on && !(await dialog.confirm(t("testModeGoLiveConfirm"), { danger: false, confirmLabel: t("testModeGoLive") }))) return;
    setBusy("toggle");
    setNotice(null);
    const result = await setTestMode({ on: !on }).catch(() => null);
    setBusy("");
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    router.refresh();
  };

  const purge = async () => {
    if (!(await dialog.confirm(t("testModePurgeConfirm")))) return;
    setBusy("purge");
    setNotice(null);
    const result = await purgeTestData().catch(() => null);
    setBusy("");
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    setNotice(t("testModePurged", { count: result.deleted ?? 0 }));
    router.refresh();
  };

  return (
    <section className={`rounded-lg px-5 py-5 ${on ? "bg-sand" : "bg-mist"}`}>
      {dialog.element}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[16px] font-bold">
            {t("testModeTitle")}
            <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] ${on ? "bg-red text-paper" : "bg-mist-2 text-black/60"}`}>
              {on ? t("testModeOn") : t("testModeOff")}
            </span>
          </p>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/65">{t("testModeHint")}</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void toggle()}
              className={`rounded-lg px-4 py-2.5 text-[14.5px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60 ${on ? "bg-ink text-paper" : "bg-red text-paper"}`}
            >
              {on ? t("testModeGoLive") : t("testModeTurnOn")}
            </button>
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => void purge()}
              className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-60"
            >
              {t("testModePurge")}
            </button>
          </div>
        ) : null}
      </div>
      {notice ? <p role="status" className="mt-3 text-[14px] font-semibold text-sea">{notice}</p> : null}
    </section>
  );
}
