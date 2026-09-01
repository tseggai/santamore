"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  refundDonation,
  resendReceipt,
} from "@/app/[locale]/admin/(protected)/donacije/actions";

type State = "idle" | "busy" | "done" | "error";

/** Refund with a required reason + receipt re-send, on one approved row. */
export function DonationActions({
  donationId,
  hasEmail,
}: {
  donationId: string;
  hasEmail: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundState, setRefundState] = useState<State>("idle");
  const [resendState, setResendState] = useState<State>("idle");

  const refund = async () => {
    if (reason.trim().length < 3) return;
    setRefundState("busy");
    const result = await refundDonation({ donationId, reason: reason.trim() }).catch(
      () => ({ ok: false }),
    );
    setRefundState(result.ok ? "done" : "error");
    if (result.ok) router.refresh();
  };

  const resend = async () => {
    setResendState("busy");
    const result = await resendReceipt({ donationId }).catch(() => ({ ok: false }));
    setResendState(result.ok ? "done" : "error");
  };

  if (refundState === "done") {
    return <span className="text-[12px] font-semibold text-sea">{t("refundDone")}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {reasonOpen ? (
        <>
          <label className="sr-only" htmlFor={`refund-reason-${donationId}`}>
            {t("refundReason")}
          </label>
          <input
            id={`refund-reason-${donationId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("refundReason")}
            maxLength={500}
            className="w-44 rounded-[9px] border-[1.5px] border-line bg-paper px-2.5 py-1.5 text-[12.5px] outline-none focus:border-sea"
          />
          <button
            type="button"
            disabled={refundState === "busy" || reason.trim().length < 3}
            onClick={refund}
            className="rounded-lg bg-red px-3 py-1.5 text-[12px] font-bold text-paper hover:bg-red-dark disabled:opacity-50"
          >
            {t("refundConfirm")}
          </button>
          <button
            type="button"
            onClick={() => setReasonOpen(false)}
            className="text-[12px] font-semibold text-ink/60 hover:text-ink"
          >
            {t("cancel")}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setReasonOpen(true)}
          className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-[12px] font-semibold hover:border-red hover:text-red-dark"
        >
          {t("refund")}
        </button>
      )}
      {hasEmail ? (
        resendState === "done" ? (
          <span className="text-[12px] font-semibold text-sea">{t("resendDone")}</span>
        ) : (
          <button
            type="button"
            disabled={resendState === "busy"}
            onClick={resend}
            className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-[12px] font-semibold hover:border-sea hover:text-sea disabled:opacity-50"
          >
            {t("resendReceipt")}
          </button>
        )
      ) : null}
      {refundState === "error" || resendState === "error" ? (
        <span role="alert" className="text-[12px] font-semibold text-red-dark">
          {t("actionError")}
        </span>
      ) : null}
    </span>
  );
}
