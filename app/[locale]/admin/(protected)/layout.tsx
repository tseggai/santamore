import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import logoWhite from "@/public/brand/SantamoreLogo-White.png";

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
    <div className="flex min-h-screen flex-col bg-mist md:flex-row">
      {/* console rail */}
      <aside className="flex flex-col gap-4 bg-sea px-4 py-5 text-paper md:min-h-screen md:w-60 md:shrink-0 md:gap-6 md:px-5 md:py-7">
        <div className="flex items-center justify-between gap-3 md:block">
          <Link href="/admin" className="inline-flex items-center gap-2.5">
            <Image src={logoWhite} alt="Santamore" className="h-7 w-auto" />
          </Link>
          <span className="rounded-full border border-paper/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/80 md:mt-3 md:inline-block">
            {t("consoleBadge")}
          </span>
        </div>

        <AdminNav />

        <div className="flex items-center gap-3 border-t border-paper/15 pt-4 md:mt-auto md:flex-col md:items-stretch md:gap-2.5">
          <Link
            href="/"
            className="whitespace-nowrap rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            {t("viewSite")} ↗
          </Link>
          <div className="px-1">
            <SignOutButton locale={locale as Locale} variant="dark" />
          </div>
        </div>
      </aside>

      {/* work surface */}
      <main id="main" className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl rounded-[18px] border-[1.5px] border-line-soft bg-paper px-5 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
