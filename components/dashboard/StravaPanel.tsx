"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  disconnectStrava,
  setStravaSharing,
  syncStravaNow,
} from "@/app/[locale]/dashboard/(protected)/strava/actions";
import type { Locale } from "@/i18n/routing";

export interface ConnectionInfo {
  athleteId: number;
  sharePublic: boolean;
  connectedAt: string;
  lastSyncAt: string | null;
  /** Scopes Strava granted, e.g. "read,activity:read_all". */
  scope: string;
}

/**
 * Connect / disconnect Strava, consent to public standings, manual sync.
 * "Connect with Strava" must use Strava's official button asset before
 * launch (docs/PLACEHOLDERS.md); until then it is a text button in
 * Strava's orange so the intent is unmistakable.
 */
export function StravaPanel({
  locale,
  connection,
  configured,
  status,
  isStaff = false,
}: {
  locale: Locale;
  connection: ConnectionInfo | null;
  configured: boolean;
  /** Staff see what is missing; runners just see "not yet". */
  isStaff?: boolean;
  /** From ?strava= after the OAuth round-trip. */
  status: string | null;
}) {
  const t = useTranslations("strava");
  const router = useRouter();
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState<"" | "sync" | "disconnect" | "share">("");
  const [notice, setNotice] = useState<string>("");

  const sync = async () => {
    setBusy("sync");
    setNotice("");
    const result = await syncStravaNow().catch(() => ({ ok: false as const, error: "server" as const }));
    setBusy("");
    if (result.ok) {
      setNotice(t("syncDone", { imported: result.imported ?? 0, awards: result.awards ?? 0 }));
      router.refresh();
    } else {
      setNotice(result.error === "throttled" ? t("syncThrottled") : t("error"));
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    setNotice("");
    const result = await disconnectStrava().catch(() => ({ ok: false as const }));
    setBusy("");
    if (result.ok) router.refresh();
    else setNotice(t("error"));
  };

  const toggleShare = async (next: boolean) => {
    setBusy("share");
    const result = await setStravaSharing({ share: next }).catch(() => ({ ok: false as const }));
    setBusy("");
    if (result.ok) router.refresh();
    else setNotice(t("error"));
  };

  const statusText: Record<string, string> = {
    connected: t("statusConnected"),
    denied: t("statusDenied"),
    scope: t("statusScope"),
    taken: t("statusTaken"),
    state: t("statusState"),
    error: t("error"),
    credentials: t("statusCredentials"),
    unconfigured: t("statusUnconfigured"),
  };

  return (
    <div className={connection ? "rounded-brand border-[1.5px] border-line px-4 py-3.5" : "rounded-brand border-[1.5px] border-line p-5"}>
      {status && statusText[status] ? (
        <p
          role={status === "connected" ? "status" : "alert"}
          className={`mb-4 rounded-[11px] px-4 py-3 text-[13.5px] font-semibold ${
            status === "connected" ? "bg-mist text-sea" : "bg-red/5 text-red-dark"
          }`}
        >
          {statusText[status]}
        </p>
      ) : null}

      {connection ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-[13.5px]">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-sea" />
              <span className="font-semibold">{t("connectedHeading")}</span>
              <span className="truncate text-ink/60">
                {connection.lastSyncAt
                  ? t("lastSync", { date: connection.lastSyncAt.slice(0, 16).replace("T", " ") })
                  : t("connectedSince", { date: connection.connectedAt.slice(0, 10) })}
              </span>
            </p>
            <button
              type="button"
              disabled={busy !== ""}
              onClick={sync}
              className="rounded-xl bg-ink px-4 py-2 text-[13px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy === "sync" ? t("syncing") : t("syncNow")}
            </button>
          </div>
          {!connection.scope.includes("activity:read_all") ? (
            <p className="mt-3 rounded-[11px] border-[1.5px] border-dashed border-line px-4 py-3 text-[13px] text-ink/70">
              {t("scopePartialHint")}{" "}
              <a
                href={`/api/strava/connect?locale=${locale}${connection.sharePublic ? "&share=1" : ""}`}
                className="font-semibold text-sea underline underline-offset-2"
              >
                {t("reconnect")}
              </a>
            </p>
          ) : null}
          <details className="mt-3 group">
            <summary className="cursor-pointer list-none text-[12.5px] font-semibold text-ink/60 hover:text-sea">
              <span className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">▸</span>{" "}
              {t("settings")}
            </summary>
            <div className="mt-3 border-t border-line-soft pt-3">
              <label className="flex items-start gap-3 text-[13.5px]">
                <input
                  type="checkbox"
                  checked={connection.sharePublic}
                  disabled={busy === "share"}
                  onChange={(event) => toggleShare(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-red"
                />
                <span>
                  <span className="font-semibold">{t("shareLabel")}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink/60">
                    {t("shareHint")}
                  </span>
                </span>
              </label>
              <p className="mt-3 text-[12.5px] text-ink/55">
                {t("connectedSince", { date: connection.connectedAt.slice(0, 10) })}
              </p>
              <button
                type="button"
                disabled={busy !== ""}
                onClick={disconnect}
                className="mt-3 rounded-xl border-[1.5px] border-line px-4 py-2 text-[13px] font-semibold transition-colors hover:border-red hover:text-red-dark disabled:opacity-60"
              >
                {t("disconnect")}
              </button>
              <p className="mt-2 text-[12px] leading-relaxed text-ink/55">{t("disconnectHint")}</p>
            </div>
          </details>
        </>
      ) : (
        <>
          <p className="text-[14px] font-bold">{t("connectHeading")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/65">{t("connectSub")}</p>
          <label className="mt-4 flex items-start gap-3 text-[13.5px]">
            <input
              type="checkbox"
              checked={share}
              onChange={(event) => setShare(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red"
            />
            <span>
              <span className="font-semibold">{t("shareLabel")}</span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink/60">
                {t("shareHint")}
              </span>
            </span>
          </label>
          {configured ? (
            <a
              href={`/api/strava/connect?locale=${locale}${share ? "&share=1" : ""}`}
              className="mt-4 inline-flex h-12 items-center rounded-xl bg-[#FC5200] px-6 text-[15px] font-bold text-paper transition-opacity hover:opacity-90"
            >
              {t("connectButton")}
            </a>
          ) : (
            <p className="mt-4 rounded-[11px] border-[1.5px] border-dashed border-line px-4 py-3 text-[13px] text-ink/60">
              {t("statusUnconfigured")}
              {isStaff ? (
                <span className="mt-1 block font-mono text-[12px] text-ink/70">
                  {t("unconfiguredStaffHint")}
                </span>
              ) : null}
            </p>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-ink/55">{t("privacyNote")}</p>
        </>
      )}

      {notice ? (
        <p role="status" className="mt-3 text-[13px] font-semibold text-sea">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
