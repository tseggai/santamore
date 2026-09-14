"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  registerStravaWebhook,
  reregisterStravaWebhook,
  type PerkActionResult,
  type WebhookStatus,
} from "@/app/[locale]/admin/(protected)/izazovi/actions";
import { SidePanel } from "@/components/console/SidePanel";

/**
 * Strava wiring for challenges, as a status button in the Events header.
 * The panel explains what is set (nothing here is typed by hand: the
 * callback comes from the site URL, the credentials from the environment)
 * and offers the one repair that exists — re-registering the subscription.
 */
export function StravaWebhookButton({ webhook }: { webhook: WebhookStatus }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const registered = webhook.subscriptions.some((s) => s.callback_url === webhook.expectedCallback);
  const state = !webhook.configured ? "unconfigured" : registered ? "ok" : "missing";

  const run = async (action: () => Promise<PerkActionResult>) => {
    setBusy(true);
    setNotice("");
    const result = await action().catch((): PerkActionResult => ({ ok: false, error: "server" }));
    setBusy(false);
    setNotice(result.ok ? t("webhookRegistered") : `${t("actionError")} ${result.message ?? ""}`.trim());
    router.refresh();
  };

  const badge =
    state === "unconfigured" ? "bg-paper text-black/60" : state === "ok" ? "bg-sea text-paper" : "bg-red text-paper";
  const label = state === "unconfigured" ? t("webhookStateUnconfigured") : state === "ok" ? t("webhookStateOk") : t("webhookStateMissing");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-mist px-3 py-2.5 text-[14px] font-semibold transition-colors hover:bg-mist-2"
      >
        {t("webhookHeading")}
        <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${badge}`}>{label}</span>
      </button>
      <SidePanel open={open} title={t("webhookHeading")} onClose={() => setOpen(false)}>
        <div className="space-y-4 text-[14.5px]">
          <p className="text-black/70">{t("webhookExplain")}</p>
          <dl className="grid gap-2 rounded-lg bg-paper px-4 py-3">
            <div>
              <dt className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-black/55">{t("webhookCallback")}</dt>
              <dd className="break-all font-mono text-[13.5px]">{webhook.expectedCallback}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-black/55">{t("webhookSubscriptions")}</dt>
              <dd className="font-mono text-[13.5px]">
                {webhook.subscriptions.length === 0 ? "—" : webhook.subscriptions.map((s) => <span key={s.id} className="block break-all">#{s.id} · {s.callback_url}</span>)}
              </dd>
            </div>
          </dl>
          {!webhook.configured ? (
            <p className="text-black/70">{t("webhookUnconfigured")}</p>
          ) : (
            <>
              <p className="text-black/70">{registered ? t("webhookOk") : t("webhookMissing")}</p>
              {webhook.error ? <p className="font-semibold text-red-dark">{webhook.error}</p> : null}
              <div className="flex flex-wrap gap-2">
                {!registered ? (
                  <button type="button" disabled={busy} onClick={() => run(registerStravaWebhook)} className="rounded-lg bg-ink px-4 py-2.5 text-[14.5px] font-bold text-paper hover:opacity-90 disabled:opacity-50">
                    {busy ? "…" : t("webhookRegister")}
                  </button>
                ) : null}
                <button type="button" disabled={busy} onClick={() => run(reregisterStravaWebhook)} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold hover:bg-mist-2 disabled:opacity-50">
                  {busy ? "…" : t("webhookReregister")}
                </button>
              </div>
              {notice ? <p className="font-semibold text-sea">{notice}</p> : null}
            </>
          )}
        </div>
      </SidePanel>
    </>
  );
}
