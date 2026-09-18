"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

export function PeopleTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("navMembers")}
      tabs={[
        { href: "/admin/clanovi", label: t("peopleTabTeam"), exact: true },
        { href: "/admin/clanovi/nalozi", label: t("peopleTabAccounts") },
      ]}
    />
  );
}
