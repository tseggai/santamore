import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { MoneyTabs } from "@/components/admin/MoneyTabs";

/** Money: the two sides of the ledger under one roof — incoming, outgoing, and the summary. */
export default async function MoneyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="pt-8">
      <h1 className="type-display text-2xl">{t("moneyTitle")}</h1>
      <MoneyTabs />
      <div className="[&>div]:pt-4">{children}</div>
    </div>
  );
}
