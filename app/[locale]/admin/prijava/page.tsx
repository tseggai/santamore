import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { routing, type Locale } from "@/i18n/routing";

export default async function AdminSignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        Santamore
      </p>
      <h1 className="type-display mt-3 text-3xl">{t("signInTitle")}</h1>
      <div className="mt-6">
        <SignInForm locale={locale as Locale} />
      </div>
    </div>
  );
}
