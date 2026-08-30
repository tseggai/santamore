"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

/**
 * Magic-link sign-in with a 6-digit code fallback. The code path matters:
 * corporate mail scanners prefetch (and thereby consume) one-time links,
 * and the PKCE link only works in the requesting browser — the OTP code
 * has neither problem. The Supabase "Magic Link" email template must
 * include {{ .Token }} for the code to reach the inbox.
 */
export function SignInForm({ locale }: { locale: Locale }) {
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "error" | "verifying" | "codeError"
  >("idle");

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea";

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

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setState("verifying");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) {
        setState("codeError");
        return;
      }
      window.location.href = `/${locale}/admin/donacije`;
    } catch {
      setState("codeError");
    }
  };

  if (state === "sent" || state === "verifying" || state === "codeError") {
    return (
      <div className="space-y-4">
        <p className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[14px] text-sea">
          {t("linkSent")}
        </p>
        <form onSubmit={verifyCode} className="space-y-3">
          <div>
            <label htmlFor="adminCode" className="text-[13px] font-semibold">
              {t("codeLabel")}
            </label>
            <p className="mt-0.5 text-[12.5px] text-ink/60">{t("codeHint")}</p>
            <input
              id="adminCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={`${inputClass} font-mono tracking-[0.2em]`}
            />
          </div>
          {state === "codeError" ? (
            <p role="alert" className="text-[13px] font-semibold text-red-dark">
              {t("codeError")}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state === "verifying"}
            className="w-full rounded-xl bg-sea px-6 py-3.5 text-[15px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
          >
            {t("codeSubmit")}
          </button>
        </form>
      </div>
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
          className={inputClass}
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
