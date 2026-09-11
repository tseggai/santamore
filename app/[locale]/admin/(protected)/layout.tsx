import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import iconWhite from "@/public/brand/SantamoreIcon-White.png";

/**
 * The admin console shell — deliberately NOT the public site: dark sea
 * sidebar, mist work surface, no marketing chrome, so staff always know
 * which side of the platform they're on. Second gate after the middleware
 * redirect: verifies the session AND the staff role server-side. The
 * queries below run with the user's own session, so the is_staff() RLS
 * policies stay the actual barrier.
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
        <p className="mt-5 rounded-brand border-[1.5px] border-dashed border-red bg-red/5 px-5 py-4 text-[15px] text-red-dark">
          {t("noAccess")}
        </p>
        <div className="mt-6">
          <SignOutButton locale={locale as Locale} />
        </div>
      </div>
    );
  }

  return (
    <ConsoleShell
      tone="sea"
      icon={iconWhite}
      homeHref="/admin"
      badge={t("consoleBadge")}
      menuLabel={t("menuOpen")}
      closeLabel={t("menuClose")}
      width="max-w-5xl"
      nav={<AdminNav />}
      footer={
        <>
          <Link
            href="/"
            className="whitespace-nowrap rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            {t("viewSite")} ↗
          </Link>
          <div className="px-1">
            <SignOutButton locale={locale as Locale} variant="dark" />
          </div>
        </>
      }
    >
      {children}
    </ConsoleShell>
  );
}
