"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

export function PeopleTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("navMembers")}
      tabs={[
        { href: "/admin/clanovi", label: t("peopleTabAll"), exact: true },
        { href: "/admin/clanovi/tim", label: t("peopleTabTeam") },
        { href: "/admin/clanovi/prikupljaci", label: t("peopleTabFundraisers") },
        { href: "/admin/clanovi/timovi", label: t("peopleTabTeams") },
        { href: "/admin/clanovi/nalozi", label: t("peopleTabAccounts") },
      ]}
    />
  );
}
