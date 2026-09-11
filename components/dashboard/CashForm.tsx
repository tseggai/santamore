"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { logCash } from "@/app/[locale]/dashboard/(protected)/actions";
import { parseEurosToCents } from "@/lib/money";

/** Log cash collected by hand for this page: how much, from whom, where. */
export function CashForm({ fundraiserId }: { fundraiserId: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [amountText, setAmountText] = useState("");
  const [donorName, setDonorName] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "done">("idle");

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-[15.5px] outline-none focus:border-sea";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = parseEurosToCents(amountText);
    if (amountCents === null || amountCents < 100) {
      setState("error");
      return;
    }
    setState("busy");
    const result = await logCash({ fundraiserId, amountCents, donorName, note }).catch(() => ({ ok: false }));
    if (result.ok) {
      setAmountText("");
      setDonorName("");
      setNote("");
      setState("done");
      router.refresh();
    } else {
      setState("error");
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div>
        <label htmlFor="cashAmount" className="text-[14px] font-semibold">
          {t("cashAmountLabel")}
        </label>
        <input
          id="cashAmount"
          type="text"
          inputMode="decimal"
          required
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          className={`${inputClass} font-mono tabular-nums`}
        />
      </div>
      <div>
        <label htmlFor="cashDonor" className="text-[14px] font-semibold">
          {t("cashDonorLabel")}
        </label>
        <input
          id="cashDonor"
          type="text"
          autoComplete="off"
          maxLength={100}
          value={donorName}
          onChange={(event) => setDonorName(event.target.value)}
          placeholder={t("cashDonorPlaceholder")}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="cashNote" className="text-[14px] font-semibold">
          {t("cashNoteLabel")}
        </label>
        <input
          id="cashNote"
          type="text"
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("cashNotePlaceholder")}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-xl bg-red px-5 py-2.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
        >
          {t("cashSubmit")}
        </button>
        {state === "error" ? (
          <p role="alert" className="text-[14px] font-semibold text-red-dark">
            {t("actionError")}
          </p>
        ) : null}
        {state === "done" ? (
          <p role="status" className="text-[14px] font-semibold text-sea">
            {t("cashLogged")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
