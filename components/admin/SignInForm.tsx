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
  // The password path: for people whose inbox never gets the link, and
  // for returning members who would rather not wait for an email.
  const [mode, setMode] = useState<"link" | "password">("link");
  const [password, setPassword] = useState("");
  const [pwState, setPwState] = useState<"idle" | "busy" | "wrong" | "noAccount" | "signupSent" | "signupFailed">("idle");
  const [pwDetail, setPwDetail] = useState("");
  /** What Supabase actually said — the owner needs it to fix the project. */
  const [detail, setDetail] = useState<{ rateLimited: boolean; message: string } | null>(null);

  const inputClass =
    "mt-1 w-full rounded-lg border-[1.5px] border-line px-3.5 py-3 text-[16px] outline-none focus:border-sea";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      const supabase = createClient();
      const target = nextPath ?? `/${locale}/admin`;
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
      window.location.href = nextPath ?? `/${locale}/admin`;
    } catch {
      setState("codeError");
    }
  };

  const signInWithPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPwState("busy");
    setPwDetail("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setPwDetail(error.message);
        // Supabase does not say which; offer the account when sign-up is open.
        setPwState(allowSignup ? "noAccount" : "wrong");
        return;
      }
      window.location.href = nextPath ?? `/${locale}/admin`;
    } catch (caught) {
      setPwDetail(caught instanceof Error ? caught.message : "");
      setPwState("wrong");
    }
  };

  const createAccount = async () => {
    setPwState("busy");
    setPwDetail("");
    try {
      const supabase = createClient();
      const target = nextPath ?? `/${locale}/dashboard`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(target)}` },
      });
      if (error) {
        setPwDetail(error.message);
        setPwState("signupFailed");
        return;
      }
      // With email confirmation on (the default, and what "My giving"
      // relies on) there is no session yet: the link in the inbox finishes it.
      if (data.session) {
        window.location.href = target;
        return;
      }
      setPwState("signupSent");
    } catch (caught) {
      setPwDetail(caught instanceof Error ? caught.message : "");
      setPwState("signupFailed");
    }
  };

  const modeSwitch = (
    <button
      type="button"
      onClick={() => {
        setMode(mode === "link" ? "password" : "link");
        setPwState("idle");
        setState("idle");
      }}
      className="text-[14px] font-semibold text-sea underline underline-offset-2 hover:text-sea-2"
    >
      {mode === "link" ? t("usePassword") : t("useLink")}
    </button>
  );

  if (mode === "password") {
    return (
      <form onSubmit={signInWithPassword} className="space-y-3">
        <div>
          <label htmlFor="pwEmail" className="text-[14px] font-semibold">
            {t("emailLabel")}
          </label>
          <input id="pwEmail" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pwPassword" className="text-[14px] font-semibold">
            {t("passwordLabel")}
          </label>
          <input
            id="pwPassword"
            type="password"
            required
            minLength={8}
            autoComplete={allowSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
          {allowSignup ? <p className="mt-1 text-[13px] text-black/55">{t("passwordHint")}</p> : null}
        </div>
        {pwState === "wrong" || pwState === "noAccount" || pwState === "signupFailed" ? (
          <div role="alert" className="text-[14px] text-red-dark">
            <p className="font-semibold">
              {pwState === "wrong" ? t("passwordWrong") : pwState === "noAccount" ? t("passwordNoAccount") : t("signupFailed")}
            </p>
            {pwDetail ? <p className="mt-0.5 font-mono text-[12.5px] text-black/55">{pwDetail}</p> : null}
          </div>
        ) : null}
        {pwState === "signupSent" ? (
          <p className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[15px] text-sea">{t("signupSent")}</p>
        ) : null}
        <button
          type="submit"
          disabled={pwState === "busy"}
          className="w-full rounded-lg bg-sea px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
        >
          {t("signInPassword")}
        </button>
        {allowSignup && pwState === "noAccount" ? (
          <button
            type="button"
            disabled={pwState !== "noAccount" || password.length < 8}
            onClick={createAccount}
            className="w-full rounded-lg bg-mist px-6 py-3.5 text-[16px] font-bold transition-colors hover:bg-mist-2 disabled:opacity-60"
          >
            {t("createAccount")}
          </button>
        ) : null}
        <div className="pt-1">{modeSwitch}</div>
      </form>
    );
  }

  if (state === "sent" || state === "verifying" || state === "codeError") {
    return (
      <div className="space-y-4">
        <p className="rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-5 py-4 text-[15px] text-sea">
          {t("linkSent")}
        </p>
        <form onSubmit={verifyCode} className="space-y-3">
          <div>
            <label htmlFor="adminCode" className="text-[14px] font-semibold">
              {t("codeLabel")}
            </label>
            <p className="mt-0.5 text-[13.5px] text-black/60">{t("codeHint")}</p>
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
            <p role="alert" className="text-[14px] font-semibold text-red-dark">
              {t("codeError")}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={state === "verifying"}
            className="w-full rounded-lg bg-sea px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
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
        <label htmlFor="adminEmail" className="text-[14px] font-semibold">
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
        <div role="alert" className="text-[14px] text-red-dark">
          <p className="font-semibold">
            {detail?.rateLimited ? t("linkRateLimited") : t("linkError")}
          </p>
          {detail?.message ? (
            <p className="mt-0.5 font-mono text-[12.5px] text-black/55">{detail.message}</p>
          ) : null}
          <p className="mt-1 text-[13.5px] text-black/65">{t("linkErrorHint")}</p>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-lg bg-sea px-6 py-3.5 text-[16px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-60"
      >
        {t("sendLink")}
      </button>
      <div className="pt-1">{modeSwitch}</div>
    </form>
  );
}
