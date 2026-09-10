"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const ITEMS = [
  { href: "/dashboard", key: "navOverview", exact: true },
  { href: "/dashboard/stranice", key: "navPages", exact: false },
  { href: "/dashboard/timovi", key: "navTeams", exact: false },
  { href: "/dashboard/alati", key: "navShare", exact: false },
  { href: "/dashboard/gotovina", key: "navCash", exact: false },
  { href: "/dashboard/strava", key: "navStrava", exact: false },
] as const;

/** Runner console nav: vertical in the sidebar (desktop), scrollable row on mobile. */
export function DashboardNav() {
  const t = useTranslations("dashboard");
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");

  return (
    <nav aria-label={t("title")} className="min-w-0">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:overflow-visible">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block whitespace-nowrap rounded-[9px] bg-paper/15 px-3.5 py-2 text-[13.5px] font-semibold text-paper"
                    : "block whitespace-nowrap rounded-[9px] px-3.5 py-2 text-[13.5px] font-medium text-paper/65 transition-colors hover:bg-paper/10 hover:text-paper"
                }
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
