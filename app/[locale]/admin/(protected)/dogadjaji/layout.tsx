import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { EventsTabs } from "@/components/admin/EventsTabs";
import { SectionHeader } from "@/components/console/SectionHeader";

/** Events and their registrations; the title line carries the screen's actions. */
export default async function EventsLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <SectionHeader title={t("eventsTitle")}>
      <EventsTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </SectionHeader>
  );
}
