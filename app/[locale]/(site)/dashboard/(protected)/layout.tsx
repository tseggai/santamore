import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { routing, type Locale } from "@/i18n/routing";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/dashboard/prijava`);
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="flex items-center justify-between gap-4 border-b-[1.5px] border-ink pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
          {t("title")}
        </p>
        <SignOutButton
          locale={locale as Locale}
          redirectTo={`/${locale}/dashboard/prijava`}
        />
      </div>
      {children}
    </div>
  );
}
