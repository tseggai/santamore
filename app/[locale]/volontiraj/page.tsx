import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { InboundForm } from "@/components/forms/InboundForm";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "volunteer" });
  return { title: `${t("title")} — Santamore` };
}

export default async function VolunteerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("volunteer");

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>
      <ul className="mt-6 max-w-xl space-y-2 text-[14px] leading-relaxed text-ink/80">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex gap-2.5">
            <span aria-hidden className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-red" />
            {t(`role${n}`)}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <InboundForm kind="volunteer" />
      </div>
    </div>
  );
}
