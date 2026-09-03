"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const ITEMS = [
  { href: "/admin", key: "navOverview", exact: true },
  { href: "/admin/donacije", key: "navDonations", exact: false },
  { href: "/admin/prijave", key: "navRegistrations", exact: false },
  { href: "/admin/prikupljaci", key: "navFundraisers", exact: false },
  { href: "/admin/isplate", key: "navDisbursements", exact: false },
  { href: "/admin/sadrzaj", key: "navContent", exact: false },
  { href: "/admin/poruke", key: "navMessages", exact: false },
] as const;

/** Console nav: vertical in the sidebar (desktop), scrollable row on mobile. */
export function AdminNav() {
  const t = useTranslations("admin");
  // Strip the locale prefix so matching works for every locale.
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");

  return (
    <nav aria-label={t("adminTitle")} className="min-w-0">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:overflow-visible">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
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
