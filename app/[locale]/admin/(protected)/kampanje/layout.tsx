import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { CausesTabs } from "@/components/admin/CausesTabs";

export default async function CausesLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="pt-8">
      <CausesTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
