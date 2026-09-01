"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  cancelRegistration,
  setBibNumber,
} from "@/app/[locale]/admin/(protected)/prijave/actions";

type State = "idle" | "busy" | "done" | "error";

/** Inline bib assignment + cancel, one registration row. */
export function RegistrationRowActions({
  registrationId,
  bib,
  status,
}: {
  registrationId: string;
  bib: string | null;
  status: "pending" | "confirmed" | "cancelled";
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [value, setValue] = useState(bib ?? "");
  const [bibState, setBibState] = useState<State>("idle");
  const [cancelState, setCancelState] = useState<State>("idle");

  const saveBib = async () => {
    setBibState("busy");
    const result = await setBibNumber({ registrationId, bib: value.trim() }).catch(
      () => ({ ok: false }),
    );
    setBibState(result.ok ? "done" : "error");
    if (result.ok) router.refresh();
  };

  const cancel = async () => {
    setCancelState("busy");
    const result = await cancelRegistration({ registrationId }).catch(() => ({
      ok: false,
    }));
    setCancelState(result.ok ? "done" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor={`bib-${registrationId}`}>
        {t("bib")}
      </label>
      <input
        id={`bib-${registrationId}`}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setBibState("idle");
        }}
        maxLength={10}
        placeholder={t("bib")}
        className="w-16 rounded-[8px] border-[1.5px] border-line bg-paper px-2 py-1 font-mono text-[12.5px] tabular-nums outline-none focus:border-sea"
      />
      <button
        type="button"
        disabled={bibState === "busy" || value === (bib ?? "")}
        onClick={saveBib}
        className="rounded-lg border-[1.5px] border-line px-2.5 py-1 text-[12px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
      >
        {bibState === "done" ? "✓" : t("bibSave")}
      </button>
      {status !== "cancelled" ? (
        <button
          type="button"
          disabled={cancelState === "busy"}
          onClick={cancel}
          className="rounded-lg px-2 py-1 text-[12px] font-semibold text-ink/50 hover:text-red-dark disabled:opacity-40"
        >
          {t("regCancel")}
        </button>
      ) : null}
      {bibState === "error" || cancelState === "error" ? (
        <span role="alert" className="text-[12px] font-semibold text-red-dark">
          {t("actionError")}
        </span>
      ) : null}
    </span>
  );
}
