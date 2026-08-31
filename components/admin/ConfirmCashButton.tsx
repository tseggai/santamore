"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { approvePledge } from "@/app/[locale]/admin/(protected)/donacije/actions";

/** One-click hand-in confirmation for a pending cash row (brief §10). */
export function ConfirmCashButton({ donationId }: { donationId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const confirm = async () => {
    setState("busy");
    const result = await approvePledge({ donationId }).catch(() => ({ ok: false }));
    if (result.ok) {
      setState("done");
      router.refresh();
    } else {
      setState("error");
    }
  };

  if (state === "done") {
    return <span className="text-[12px] font-semibold text-sea">{t("approvedOk")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={confirm}
        className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold transition-colors hover:border-sea hover:text-sea disabled:opacity-60"
      >
        {t("confirmCash")}
      </button>
      {state === "error" ? (
        <span role="alert" className="text-[12px] font-semibold text-red-dark">
          {t("actionError")}
        </span>
      ) : null}
    </span>
  );
}
