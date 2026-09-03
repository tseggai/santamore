"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createFundraiserPage } from "@/app/[locale]/(site)/dashboard/(protected)/actions";

export function CreatePageForm() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("busy");
    const result = await createFundraiserPage({ title }).catch(() => ({ ok: false }));
    if (result.ok) {
      router.refresh();
    } else {
      setState("error");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="pageTitle" className="text-[13px] font-semibold">
          {t("pageTitleLabel")}
        </label>
        <input
          id="pageTitle"
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea"
        />
      </div>
      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "busy"}
        className="w-full rounded-xl bg-red px-6 py-3.5 text-[15px] font-bold text-paper shadow-[0_2px_0_var(--color-red-dark)] transition-colors hover:bg-red-dark disabled:opacity-60"
      >
        {t("createSubmit")}
      </button>
    </form>
  );
}
