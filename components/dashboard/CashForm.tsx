"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { logCash } from "@/app/[locale]/dashboard/(protected)/actions";
import { parseEurosToCents } from "@/lib/money";

export function CashForm() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [amountText, setAmountText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = parseEurosToCents(amountText);
    if (amountCents === null || amountCents < 100) {
      setState("error");
      return;
    }
    setState("busy");
    const result = await logCash({ amountCents }).catch(() => ({ ok: false }));
    if (result.ok) {
      setAmountText("");
      setState("idle");
      router.refresh();
    } else {
      setState("error");
    }
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="cashAmount" className="text-[13px] font-semibold">
          {t("cashAmountLabel")}
        </label>
        <input
          id="cashAmount"
          type="text"
          inputMode="decimal"
          required
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          className="mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 font-mono text-[15px] tabular-nums outline-none focus:border-sea"
        />
      </div>
      <button
        type="submit"
        disabled={state === "busy"}
        className="shrink-0 rounded-xl bg-red px-5 py-3.5 text-[14px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {t("cashSubmit")}
      </button>
      {state === "error" ? (
        <p role="alert" className="w-full text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
    </form>
  );
}
