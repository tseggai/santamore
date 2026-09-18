"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

export function EventsTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("navEvents")}
      tabs={[
        { href: "/admin/dogadjaji", label: t("eventsTabEvents"), exact: true },
        { href: "/admin/dogadjaji/prijave", label: t("eventsTabRegistrations") },
      ]}
    />
  );
}
