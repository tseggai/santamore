import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { SettingsTabs } from "@/components/admin/SettingsTabs";

/**
 * Settings: the parts of the site that are not a record of something —
 * the editorial pages, news, an overview of every photo set, and the
 * demo data tool. Records (causes, events, supporters, beneficiaries,
 * members, money) each have their own place in the left nav.
 */
export default async function SettingsLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="pt-8">
      <h1 className="type-display text-2xl">{t("settingsTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("settingsHint")}</p>
      <SettingsTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
