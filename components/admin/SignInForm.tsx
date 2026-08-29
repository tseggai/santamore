"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

export function SignInForm({ locale }: { locale: Locale }) {
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/${locale}/admin/donacije`,
          // Closed staff login: never an open account-creation endpoint.
          shouldCreateUser: false,
        },
      });
      setState(error ? "error" : "sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <p className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[14px] text-sea">
        {t("linkSent")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="adminEmail" className="text-[13px] font-semibold">
          {t("emailLabel")}
        </label>
        <input
          id="adminEmail"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea"
        />
      </div>
      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("linkError")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-xl bg-sea px-6 py-3.5 text-[15px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
      >
        {t("sendLink")}
      </button>
    </form>
  );
}
