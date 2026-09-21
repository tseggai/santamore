import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { StaffTabs } from "@/components/admin/StaffTabs";
import { SectionHeader } from "@/components/console/SectionHeader";

/** Staff: who we are, and who may do what in the console (docs/ROLES.md). */
export default async function StaffLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <SectionHeader title={t("navStaff")} hint={t("staffSectionHint")}>
      <StaffTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </SectionHeader>
  );
}
