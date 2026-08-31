"use client";

import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";

export function SignOutButton({
  locale,
  redirectTo,
}: {
  locale: Locale;
  redirectTo?: string;
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
      className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
    >
      {t("signOut")}
    </button>
  );
}
