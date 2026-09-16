"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const TABS = [
  { href: "/admin/kampanje", key: "causesTabCauses", exact: true },
  { href: "/admin/kampanje/prijedlozi", key: "causesTabProposals", exact: false },
] as const;

/** Causes we run, and causes the community proposes. */
export function CausesTabs() {
  const t = useTranslations("admin");
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");
  return (
    <nav aria-label={t("campaignsTitle")} className="flex gap-1 border-b-[0.5px] border-line">
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
