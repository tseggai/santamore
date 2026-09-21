"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

/** Staff: the records that make up the team, and every account with its access level. */
export function StaffTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("navStaff")}
      tabs={[
        { href: "/admin/osoblje", label: t("staffTabTeam"), exact: true },
        { href: "/admin/osoblje/nalozi", label: t("staffTabAccounts") },
      ]}
    />
  );
}
