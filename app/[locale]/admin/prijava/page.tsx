import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { routing, type Locale } from "@/i18n/routing";

export default async function AdminSignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    // Standalone console door — no public chrome on purpose.
    <div className="flex min-h-screen items-center justify-center bg-sea px-5 py-10">
      <div className="w-full max-w-md rounded-brand bg-paper px-6 py-8 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
          Santamore · {t("consoleBadge")}
        </p>
        <h1 className="type-display mt-3 text-3xl">{t("signInTitle")}</h1>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-brand border-[1.5px] border-dashed border-red bg-red/5 px-4 py-3 text-[13.5px] font-semibold text-red-dark"
        >
          {t("linkFailed")}
        </p>
      ) : null}
      <div className="mt-6">
        <SignInForm locale={locale as Locale} />
      </div>
      </div>
    </div>
  );
}
