import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SupportersTabs } from "@/components/admin/SupportersTabs";

/** Supporters: sponsors, fundraisers, donors, participants and teams — everyone the money comes through. */
export default async function SupportersLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="pt-8">
      <h1 className="type-display text-2xl">{t("supportersTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("supportersSectionHint")}</p>
      <SupportersTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
