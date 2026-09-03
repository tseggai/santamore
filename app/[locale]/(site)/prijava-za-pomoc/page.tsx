import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { BeneficiaryForm } from "@/components/forms/BeneficiaryForm";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "apply" });
  return { title: `${t("title")} — Santamore` };
}

export default async function BeneficiaryApplicationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("apply");

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>

      {/* The three-step promise, straight from the team guide. */}
      <ol className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <li key={n} className="rounded-brand border-[1.5px] border-line px-4 py-3.5">
            <span className="font-mono text-[11px] text-red">0{n}</span>
            <span className="mt-1 block text-[13px] font-semibold leading-snug">
              {t(`step${n}Title`)}
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-ink/60">
              {t(`step${n}Desc`)}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <BeneficiaryForm />
      </div>
    </div>
  );
}
