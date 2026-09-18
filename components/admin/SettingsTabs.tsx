"use client";

import { useTranslations } from "next-intl";

import { SectionTabs } from "@/components/console/SectionTabs";

export function SettingsTabs() {
  const t = useTranslations("admin");
  return (
    <SectionTabs
      ariaLabel={t("navSettings")}
      tabs={[
        { href: "/admin/podesavanja", label: t("settingsTabPages"), exact: true },
        { href: "/admin/podesavanja/vijesti", label: t("settingsTabNews") },
        { href: "/admin/podesavanja/fotografije", label: t("settingsTabPhotos") },
        { href: "/admin/podesavanja/demo", label: t("settingsTabDemo") },
      ]}
    />
  );
}
