import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { PeopleTabs } from "@/components/admin/PeopleTabs";

/** People: the team (with or without an account) and every account. */
export default async function PeopleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="pt-8">
      <h1 className="type-display text-2xl">{t("peopleTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("peopleHint")}</p>
      <PeopleTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
