"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

/** Supporters: everyone who brings money in, one tab per way of doing it. */
export function SupportersTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("navSupporters")}
      tabs={[
        { href: "/admin/podrska", label: t("supportersTabSponsors"), exact: true },
        { href: "/admin/podrska/prikupljaci", label: t("supportersTabFundraisers") },
        { href: "/admin/podrska/donatori", label: t("supportersTabDonors") },
        { href: "/admin/podrska/ucesnici", label: t("supportersTabParticipants") },
        { href: "/admin/podrska/timovi", label: t("supportersTabTeams") },
      ]}
    />
  );
}
