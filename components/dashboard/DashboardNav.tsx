"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const ITEMS = [
  { href: "/dashboard", key: "navOverview", exact: true },
  { href: "/dashboard/stranice", key: "navPages", exact: false },
  { href: "/dashboard/strava", key: "navStrava", exact: false },
  { href: "/dashboard/donacije", key: "navGiving", exact: false },
] as const;

/** Runner console nav: one vertical list, in the desktop rail and the phone drawer alike. */
export function DashboardNav() {
  const t = useTranslations("dashboard");
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");

  return (
    <nav aria-label={t("title")} className="min-w-0">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
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
