"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const TABS = [
  { href: "/admin/novac", key: "moneyTabOverview", exact: true },
  { href: "/admin/novac/priliv", key: "moneyTabIn", exact: false },
  { href: "/admin/novac/odliv", key: "moneyTabOut", exact: false },
  { href: "/admin/novac/zid", key: "moneyTabWall", exact: false },
] as const;

export function MoneyTabs() {
  const t = useTranslations("admin");
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");
  return (
    <nav aria-label={t("moneyTitle")} className="mt-5 flex gap-1 border-b-[0.5px] border-line">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px rounded-t-lg px-4 py-2.5 text-[14.5px] font-semibold transition-colors ${
              active ? "border-b-2 border-ink text-black" : "text-black/55 hover:text-black"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
