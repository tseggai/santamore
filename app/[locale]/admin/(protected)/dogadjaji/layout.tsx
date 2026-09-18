import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { EventsTabs } from "@/components/admin/EventsTabs";

export default async function EventsLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="pt-8">
      <EventsTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
