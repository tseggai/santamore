import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignInForm } from "@/components/admin/SignInForm";
import { routing, type Locale } from "@/i18n/routing";

export default async function RunnerSignInPage({
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
  const [t, tAdmin] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("admin"),
  ]);

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        Santamore
      </p>
      <h1 className="type-display mt-3 text-3xl">{t("signInTitle")}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink/65">{t("signInSub")}</p>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-brand border-[1.5px] border-dashed border-red bg-red/5 px-4 py-3 text-[13.5px] font-semibold text-red-dark"
        >
          {tAdmin("linkFailed")}
        </p>
      ) : null}
      <div className="mt-6">
        <SignInForm
          locale={locale as Locale}
          nextPath={`/${locale}/dashboard`}
          allowSignup
        />
      </div>
    </div>
  );
}
