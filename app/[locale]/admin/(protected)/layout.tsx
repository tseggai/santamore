import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Second gate after the middleware redirect: verifies the session AND the
 * staff role server-side. The queries below run with the user's own
 * session, so the is_staff() RLS policies stay the actual barrier.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/admin/prijava`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isStaff = profile?.role === "admin" || profile?.role === "chapter_lead";

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <h1 className="type-display text-3xl">{t("adminTitle")}</h1>
        <p className="mt-5 rounded-brand border-[1.5px] border-dashed border-red bg-red/5 px-5 py-4 text-[14px] text-red-dark">
          {t("noAccess")}
        </p>
        <div className="mt-6">
          <SignOutButton locale={locale as Locale} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex items-center justify-between gap-4 border-b-[1.5px] border-ink pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
          {t("adminTitle")}
        </p>
        <SignOutButton locale={locale as Locale} />
      </div>
      {children}
    </div>
  );
}
