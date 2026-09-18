"use client";

import { usePathname } from "next/navigation";

import { Link } from "@/i18n/navigation";

export interface SectionTab {
  href: string;
  label: string;
  /** Match the path exactly (for a section's index) rather than by prefix. */
  exact?: boolean;
}

/** The second-level tabs of a console section, under its title. */
export function SectionTabs({ tabs, ariaLabel }: { tabs: SectionTab[]; ariaLabel: string }) {
  // Strip the locale prefix so matching works for every locale.
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");
  return (
    <nav aria-label={ariaLabel} className="mt-5 flex flex-wrap gap-1 border-b-[0.5px] border-line">
      {tabs.map((tab) => {
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
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
