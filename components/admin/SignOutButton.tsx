"use client";

import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

export function SignOutButton({
  locale,
  redirectTo,
  variant = "light",
}: {
  locale: Locale;
  redirectTo?: string;
  /** "dark" sits on the sea console rail. */
  variant?: "light" | "dark";
}) {
  const t = useTranslations("admin");

  const signOut = async () => {
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.href = redirectTo ?? `/${locale}/admin/prijava`;
    }
  };

  return (
    <button
      type="button"
      onClick={signOut}
      className={
        variant === "dark"
          ? "rounded-lg border-[1.5px] border-paper/30 px-3 py-1.5 text-[12.5px] font-semibold text-paper/80 transition-colors hover:border-paper hover:text-paper"
          : "rounded-lg border-[1.5px] border-line px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
      }
    >
      {t("signOut")}
    </button>
  );
}
