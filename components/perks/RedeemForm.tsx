"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { redeemAward, type RedeemOutcome } from "@/app/[locale]/(site)/r/actions";

/** The partner's side of the award page: PIN in, smoothie out. */
export function RedeemForm({ code }: { code: string }) {
  const t = useTranslations("perks");
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RedeemOutcome | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await redeemAward({ code, pin }).catch(() => "server" as const);
    setBusy(false);
    setOutcome(result);
    if (result === "ok") {
      setPin("");
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="rounded-brand border-[1.5px] border-ink bg-sand p-5">
      <p className="text-[15px] font-bold">{t("redeemHeading")}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink/65">{t("redeemHint")}</p>
      <div className="mt-3 flex gap-2">
        <label htmlFor="redeemPin" className="sr-only">
          {t("pinLabel")}
        </label>
        <input
          id="redeemPin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{4,8}"
          maxLength={8}
          required
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          placeholder={t("pinLabel")}
          className="w-full rounded-[11px] border-[1.5px] border-line bg-paper px-3.5 py-3 font-mono text-[19px] tracking-[0.3em] outline-none focus:border-sea"
        />
        <button
          type="submit"
          disabled={busy || pin.length < 4}
          className="shrink-0 rounded-xl bg-red px-5 py-3 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
        >
          {busy ? "…" : t("redeemButton")}
        </button>
      </div>
      {outcome ? (
        <p
          role={outcome === "ok" ? "status" : "alert"}
          className={`mt-3 text-[14.5px] font-semibold ${
            outcome === "ok" ? "text-sea" : "text-red-dark"
          }`}
        >
          {t(`redeemOutcome.${outcome}`)}
        </p>
      ) : null}
    </form>
  );
}
