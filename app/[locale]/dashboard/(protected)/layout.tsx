import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/admin/SignOutButton";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { DonateProvider } from "@/components/donate/DonateDialog";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import iconWhite from "@/public/brand/SantamoreIcon-White.png";

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
    <ConsoleShell
      tone="ink"
      icon={iconWhite}
      homeHref="/dashboard"
      badge={t("consoleBadge")}
      menuLabel={t("menuOpen")}
      closeLabel={t("menuClose")}
      nav={<DashboardNav />}
      footer={
        <>
          <Link
            href="/"
            className="whitespace-nowrap rounded-lg px-3.5 py-2 text-[13.5px] font-medium text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
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
        </>
      }
    >
      <DonateProvider>{children}</DonateProvider>
    </ConsoleShell>
  );
}
