import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { CausesTabs } from "@/components/admin/CausesTabs";
import { SectionHeader } from "@/components/console/SectionHeader";

/** Causes and the community's proposals; the title line carries the screen's actions. */
export default async function CausesLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <SectionHeader title={t("campaignsTitle")}>
      <CausesTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </SectionHeader>
  );
}
