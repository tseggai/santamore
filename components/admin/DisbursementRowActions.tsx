"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  markDisbursementPaid,
  publishDisbursement,
} from "@/app/[locale]/admin/(protected)/isplate/actions";

type State = "idle" | "busy" | "error";

export function DisbursementRowActions({
  disbursementId,
  isPublished,
  isPaid,
}: {
  disbursementId: string;
  isPublished: boolean;
  isPaid: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [confirmPublish, setConfirmPublish] = useState(false);

  const run = async (action: () => Promise<{ ok: boolean }>) => {
    setState("busy");
    const result = await action().catch(() => ({ ok: false }));
    setState(result.ok ? "idle" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {!isPublished ? (
        confirmPublish ? (
          <>
            <span className="text-[12px] text-ink/60">{t("disbPublishWarn")}</span>
            <button
              type="button"
              disabled={state === "busy"}
              onClick={() => run(() => publishDisbursement({ disbursementId }))}
              className="rounded-lg bg-red px-3 py-1.5 text-[12px] font-bold text-paper hover:bg-red-dark disabled:opacity-50"
            >
              {t("disbPublishConfirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmPublish(false)}
              className="text-[12px] font-semibold text-ink/60 hover:text-ink"
            >
              {t("cancel")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmPublish(true)}
            className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea"
          >
            {t("disbPublish")}
          </button>
        )
      ) : null}
      {isPublished && !isPaid ? (
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => run(() => markDisbursementPaid({ disbursementId }))}
          className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
        >
          {t("disbMarkPaid")}
        </button>
      ) : null}
      {state === "error" ? (
        <span role="alert" className="text-[12px] font-semibold text-red-dark">
          {t("actionError")}
        </span>
      ) : null}
    </span>
  );
}
