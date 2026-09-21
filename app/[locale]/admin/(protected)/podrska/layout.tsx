import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SupportersTabs } from "@/components/admin/SupportersTabs";
import { SectionHeader } from "@/components/console/SectionHeader";

/** Supporters: sponsors, fundraisers, donors, participants and teams — everyone the money comes through. */
export default async function SupportersLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <SectionHeader title={t("supportersTitle")} hint={t("supportersSectionHint")}>
      <SupportersTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </SectionHeader>
  );
}
