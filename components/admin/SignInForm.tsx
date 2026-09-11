"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { enabledOAuthProviders, type OAuthProvider } from "@/lib/auth/providers";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

const GoogleMark = () => (
  <svg aria-hidden viewBox="0 0 18 18" className="h-[18px] w-[18px]">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

const AppleMark = () => (
  <svg aria-hidden viewBox="0 0 17 20" className="h-[18px] w-[18px]" fill="currentColor">
    <path d="M14.2 10.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.8zM11.8 3.4c.7-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z" />
  </svg>
);

/**
 * Magic-link sign-in with a 6-digit code fallback. The code path matters:
 * corporate mail scanners prefetch (and thereby consume) one-time links,
 * and the PKCE link only works in the requesting browser — the OTP code
 * has neither problem. The Supabase "Magic Link" email template must
 * include {{ .Token }} for the code to reach the inbox.
 */
export function SignInForm({
  locale,
  nextPath,
  allowSignup = false,
}: {
  locale: Locale;
  /** Locale-prefixed path to land on after the code/link, e.g. "/me/dashboard". */
  nextPath?: string;
  /** Runners may create accounts; the staff login stays closed. */
  allowSignup?: boolean;
}) {
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "error" | "verifying" | "codeError"
  >("idle");
  /** What Supabase actually said — the owner needs it to fix the project. */
  const [detail, setDetail] = useState<{ rateLimited: boolean; message: string } | null>(null);

  const inputClass =
    "mt-1 w-full rounded-[11px] border-[1.5px] border-line px-3.5 py-3 text-[15px] outline-none focus:border-sea";
  const providers = enabledOAuthProviders();
  const target = nextPath ?? `/${locale}/admin/donacije`;

  // Google / Apple: Supabase runs the OAuth dance and returns to our
  // callback with a PKCE code, exactly like the magic link.
  const signInWith = async (provider: OAuthProvider) => {
    setState("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(target)}`,
        },
      });
      if (error) {
        setDetail({ rateLimited: false, message: error.message });
        setState("error");
      }
      // On success the browser is already navigating to the provider.
    } catch (caught) {
      setDetail({ rateLimited: false, message: caught instanceof Error ? caught.message : "" });
      setState("error");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(target)}`,
          shouldCreateUser: allowSignup,
        },
      });
      if (error) {
        const rateLimited =
          error.status === 429 || /rate limit|after \d+ seconds/i.test(error.message);
        setDetail({ rateLimited, message: error.message });
        setState("error");
        return;
      }
      setDetail(null);
      setState("sent");
    } catch (caught) {
      setDetail({ rateLimited: false, message: caught instanceof Error ? caught.message : "" });
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
      window.location.href = nextPath ?? `/${locale}/admin/donacije`;
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
        <div role="alert" className="text-[13px] text-red-dark">
          <p className="font-semibold">
            {detail?.rateLimited ? t("linkRateLimited") : t("linkError")}
          </p>
          {detail?.message ? (
            <p className="mt-0.5 font-mono text-[11.5px] text-ink/55">{detail.message}</p>
          ) : null}
        </div>
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
