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
  athleteName: string | null;
  avatarUrl: string | null;
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

  const connectHref = `/api/strava/connect?locale=${locale}${(connection ? connection.sharePublic : share) ? "&share=1" : ""}`;
  const ghostBtn =
    "rounded-lg bg-mist px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60";

  return (
    <div>
      {status && statusText[status] ? (
        <p
          role={status === "connected" ? "status" : "alert"}
          className={`mb-4 rounded-lg px-4 py-3 text-[14.5px] font-semibold ${
            status === "connected" ? "bg-mist text-sea" : "bg-red/8 text-red-dark"
          }`}
        >
          {statusText[status]}
        </p>
      ) : null}

      {/* row 1: state, and the one action that changes it — top right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {connection ? (
          <p className="flex min-w-0 items-center gap-3">
            {connection.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Strava CDN, sizes vary; not worth the optimizer
              <img
                src={connection.avatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FC5200] text-[15px] font-bold text-paper"
              >
                {(connection.athleteName ?? "S").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 truncate text-[16px]">
              <span className="font-bold">{connection.athleteName ?? t("connectedHeading")}</span>
              {connection.athleteName ? (
                <span className="text-ink/55"> {t("onStrava")}</span>
              ) : null}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[16px] font-bold">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-ink/25" />
            {t("notConnectedHeading")}
          </p>
        )}
        {connection ? (
          <button
            type="button"
            disabled={busy !== ""}
            onClick={disconnect}
            className={`${ghostBtn} hover:text-red-dark`}
          >
            {busy === "disconnect" ? "…" : t("disconnect")}
          </button>
        ) : configured ? (
          <a
            href={connectHref}
            className="inline-flex h-11 items-center rounded-lg bg-[#FC5200] px-5 text-[15px] font-bold text-paper transition-opacity hover:opacity-90"
          >
            {t("connectButton")}
          </a>
        ) : null}
      </div>

      {/* row 2: freshness and the manual sync, or what connecting does */}
      {connection ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[14px] text-ink/60">
            {connection.lastSyncAt
              ? t("lastSync", { date: connection.lastSyncAt.slice(0, 16).replace("T", " ") })
              : t("connectedSince", { date: connection.connectedAt.slice(0, 10) })}
          </span>
          <button type="button" disabled={busy !== ""} onClick={sync} className={ghostBtn}>
            {busy === "sync" ? t("syncing") : t("syncNow")}
          </button>
          <span className="text-[13px] text-ink/50">{t("autoSyncNote")}</span>
        </div>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-ink/65">
          {configured ? t("connectSub") : t("statusUnconfigured")}
          {!configured && isStaff ? (
            <span className="mt-1 block font-mono text-[13px] text-ink/70">{t("unconfiguredStaffHint")}</span>
          ) : null}
        </p>
      )}

      {connection && !connection.scope.includes("activity:read_all") ? (
        <p className="mt-3 rounded-lg bg-mist px-4 py-3 text-[14px] text-ink/70">
          {t("scopePartialHint")}{" "}
          <a href={connectHref} className="font-semibold text-sea underline underline-offset-2">
            {t("reconnect")}
          </a>
        </p>
      ) : null}

      {/* row 3: the one consent, identical in both states */}
      <label className="mt-4 flex items-start gap-3 text-[14.5px]">
        <input
          type="checkbox"
          checked={connection ? connection.sharePublic : share}
          disabled={busy === "share"}
          onChange={(event) =>
            connection ? toggleShare(event.target.checked) : setShare(event.target.checked)
          }
          className="mt-1 h-4 w-4 accent-red"
        />
        <span>
          <span className="font-semibold">{t("shareLabel")}</span>
          <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink/60">{t("shareHint")}</span>
        </span>
      </label>
      <p className="mt-3 text-[13px] leading-relaxed text-ink/50">
        {connection ? t("disconnectHint") : t("privacyNote")}
      </p>

      {notice ? (
        <p role="status" className="mt-3 text-[14px] font-semibold text-sea">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
