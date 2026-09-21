import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { StaffTabs } from "@/components/admin/StaffTabs";

/** Staff: who we are, and who may do what in the console (docs/ROLES.md). */
export default async function StaffLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="pt-8">
      <h1 className="type-display text-2xl">{t("navStaff")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("staffSectionHint")}</p>
      <StaffTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
