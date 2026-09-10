import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/admin/SignOutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import logoWhite from "@/public/brand/SantamoreLogo-White.png";

/**
 * The runner console: same shell as the admin (ink rail, mist work surface)
 * so a person with pages, teams and rewards has one place for all of it.
 * The middleware already bounced anonymous visitors to the sign-in page;
 * this is the second gate.
 */
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
    <div className="flex min-h-screen flex-col bg-mist md:flex-row">
      <aside className="flex flex-col gap-4 bg-ink px-4 py-5 text-paper md:min-h-screen md:w-60 md:shrink-0 md:gap-6 md:px-5 md:py-7">
        <div className="flex items-center justify-between gap-3 md:block">
          <Link href="/dashboard" className="inline-flex items-center gap-2.5">
            <Image src={logoWhite} alt="Santamore" className="h-7 w-auto" />
          </Link>
          <span className="rounded-full border border-paper/30 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/80 md:mt-3 md:inline-block">
            {t("consoleBadge")}
          </span>
        </div>

        <DashboardNav />

        <div className="flex items-center gap-3 border-t border-paper/15 pt-4 md:mt-auto md:flex-col md:items-stretch md:gap-2.5">
          <Link
            href="/"
            className="whitespace-nowrap rounded-[9px] px-3.5 py-2 text-[12.5px] font-medium text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            {t("viewSite")} ↗
          </Link>
          <div className="px-1">
            <SignOutButton
              locale={locale as Locale}
              redirectTo={`/${locale}/dashboard/prijava`}
              variant="dark"
            />
          </div>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-4xl rounded-[18px] border-[1.5px] border-line-soft bg-paper px-5 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
