"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  setFundraiserModeration,
  setMessageHidden,
} from "@/app/[locale]/admin/(protected)/prikupljaci/actions";

type State = "idle" | "busy" | "error" | "incomplete";

export function FundraiserStatusButtons({
  fundraiserId,
  status,
}: {
  fundraiserId: string;
  status: "draft" | "active" | "hidden";
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, setState] = useState<State>("idle");

  const set = async (next: "active" | "hidden") => {
    setState("busy");
    const result = await setFundraiserModeration({ fundraiserId, status: next }).catch(
      () => ({ ok: false as const, reason: undefined }),
    );
    setState(result.ok ? "idle" : result.reason === "incomplete" ? "incomplete" : "error");
    if (result.ok) router.refresh();
  };

  // Publishing is the owner's move, from their editor; staff hide a page
  // or put a hidden one back. A draft only says so.
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {status === "draft" ? <span className="text-[13px] text-black/55">{t("pageDraftNote")}</span> : null}
      {status === "hidden" ? (
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => set("active")}
          className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
        >
          {t("pageReinstate")}
        </button>
      ) : null}
      {status !== "hidden" ? (
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => set("hidden")}
          className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-red hover:text-red-dark disabled:opacity-40"
        >
          {t("pageHide")}
        </button>
      ) : null}
      {state === "error" || state === "incomplete" ? (
        <span role="alert" className="text-[13px] font-semibold text-red-dark">
          {state === "incomplete" ? t("pageIncomplete") : t("actionError")}
        </span>
      ) : null}
    </span>
  );
}

export function MessageHideButton({
  donationId,
  hidden,
}: {
  donationId: string;
  hidden: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, setState] = useState<State>("idle");

  const toggle = async () => {
    setState("busy");
    const result = await setMessageHidden({ donationId, hidden: !hidden }).catch(
      () => ({ ok: false }),
    );
    setState(result.ok ? "idle" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={state === "busy"}
        onClick={toggle}
        className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[13px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
      >
        {hidden ? t("messageShow") : t("messageHide")}
      </button>
      {state === "error" ? (
        <span role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </span>
      ) : null}
    </span>
  );
}
