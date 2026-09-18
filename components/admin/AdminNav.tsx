"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const ITEMS = [
  { href: "/admin", key: "navOverview", exact: true },
  { href: "/admin/novac", key: "navMoney", exact: false },
  { href: "/admin/kampanje", key: "navCampaigns", exact: false },
  { href: "/admin/dogadjaji", key: "navEvents", exact: false },
  { href: "/admin/korisnici", key: "navBeneficiaries", exact: false },
  { href: "/admin/podrska", key: "navSupporters", exact: false },
  { href: "/admin/clanovi", key: "navMembers", exact: false },
  { href: "/admin/poruke", key: "navMessages", exact: false },
  { href: "/admin/podesavanja", key: "navSettings", exact: false },
] as const;

/** Console nav: one vertical list, in the desktop rail and the phone drawer alike. */
export function AdminNav() {
  const t = useTranslations("admin");
  // Strip the locale prefix so matching works for every locale.
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");

  return (
    <nav aria-label={t("adminTitle")} className="min-w-0">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block whitespace-nowrap rounded-lg bg-paper/15 px-3.5 py-2 text-[14.5px] font-semibold text-paper"
                    : "block whitespace-nowrap rounded-lg px-3.5 py-2 text-[14.5px] font-medium text-paper/65 transition-colors hover:bg-paper/10 hover:text-paper"
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
