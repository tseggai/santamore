"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { sendPledgeInstructions } from "@/app/[locale]/admin/(protected)/novac/priliv/actions";

/**
 * Pledges still waiting for their transfer details. With the real IBAN in
 * place the button emails every one of them; before that it says what is
 * missing.
 */
export function PledgeInstructionsCard({ waiting, bankReady }: { waiting: number; bankReady: boolean }) {
  const t = useTranslations("admin");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    const res = await sendPledgeInstructions().catch(() => ({ ok: false as const, sent: 0, failed: 0 }));
    setBusy(false);
    setResult(res.ok ? t("pledgesSent", { sent: res.sent, failed: res.failed }) : t("actionError"));
  };

  if (waiting === 0 && !result) return null;
  return (
    <div className="mb-6 rounded-lg bg-sand px-5 py-4">
      <p className="type-eyebrow text-black/55">{t("pledgesHeading")}</p>
      <p className="mt-1 text-[15px] font-semibold">{t("pledgesWaiting", { count: waiting })}</p>
      <p className="mt-1 text-[13.5px] text-black/60">{bankReady ? t("pledgesReadyHint") : t("pledgesNotReadyHint")}</p>
      {bankReady && waiting > 0 ? (
        <button type="button" disabled={busy} onClick={() => void send()} className="mt-3 rounded-lg bg-ink px-4 py-2 text-[14px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? t("pledgesSending") : t("pledgesSend", { count: waiting })}
        </button>
      ) : null}
      {result ? <p className="mt-2 text-[13.5px] font-semibold">{result}</p> : null}
    </div>
  );
}
