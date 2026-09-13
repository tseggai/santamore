"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  registerStravaWebhook,
  type PerkActionResult,
  type WebhookStatus,
} from "@/app/[locale]/admin/(protected)/izazovi/actions";

/** Strava wiring for challenges: is the webhook subscribed, and one button to fix it. */
export function StravaWebhookPanel({ webhook }: { webhook: WebhookStatus }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const registered = webhook.subscriptions.some((s) => s.callback_url === webhook.expectedCallback);

  const register = async () => {
    setBusy(true);
    setNotice("");
    const result = await registerStravaWebhook().catch((): PerkActionResult => ({ ok: false, error: "server" }));
    setBusy(false);
    setNotice(result.ok ? t("webhookRegistered") : `${t("actionError")} ${result.message ?? ""}`.trim());
    router.refresh();
  };

  return (
    <details className="rounded-lg bg-mist px-4 py-3">
      <summary className="cursor-pointer text-[14.5px] font-bold">
        {t("webhookHeading")}{" "}
        <span className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
          !webhook.configured ? "bg-paper text-black/60" : registered ? "bg-sea text-paper" : "bg-red text-paper"
        }`}>
          {!webhook.configured ? t("webhookStateUnconfigured") : registered ? t("webhookStateOk") : t("webhookStateMissing")}
        </span>
      </summary>
      {!webhook.configured ? (
        <p className="mt-2 text-[14px] text-black/65">{t("webhookUnconfigured")}</p>
      ) : (
        <>
          <p className="mt-2 text-[14px] text-black/65">
            {registered ? t("webhookOk") : t("webhookMissing")}{" "}
            <span className="font-mono text-[13px]">{webhook.expectedCallback}</span>
            {webhook.error ? <span className="block text-red-dark">{webhook.error}</span> : null}
          </p>
          {!registered ? (
            <button type="button" disabled={busy} onClick={register} className="mt-2 rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold hover:bg-mist-2 disabled:opacity-50">
              {busy ? "…" : t("webhookRegister")}
            </button>
          ) : null}
          {notice ? <p className="mt-2 text-[13.5px] font-semibold text-sea">{notice}</p> : null}
        </>
      )}
    </details>
  );
}
