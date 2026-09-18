"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

export function MoneyTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("moneyTitle")}
      tabs={[
        { href: "/admin/novac", label: t("moneyTabOverview"), exact: true },
        { href: "/admin/novac/priliv", label: t("moneyTabIn") },
        { href: "/admin/novac/odliv", label: t("moneyTabOut") },
        { href: "/admin/novac/zid", label: t("moneyTabWall") },
        { href: "/admin/novac/godine", label: t("moneyTabYears") },
      ]}
    />
  );
}
