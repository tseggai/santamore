"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { Link } from "@/i18n/navigation";

export interface SectionTab {
  href: string;
  label: string;
  /** Match the path exactly (for a section's index) rather than by prefix. */
  exact?: boolean;
}

/**
 * The second-level tabs of a console section, under its title. On a phone
 * they stay on one line and scroll sideways, fading at the right edge, so
 * six tabs cost the height of one row; the current tab is brought into view.
 */
export function SectionTabs({ tabs, ariaLabel }: { tabs: SectionTab[]; ariaLabel: string }) {
  // Strip the locale prefix so matching works for every locale.
  const pathname = usePathname().replace(/^\/(me|en|ru)(?=\/|$)/, "");
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2);
  }, [pathname]);
  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className="relative mt-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b-[0.5px] border-line pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pr-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-[14.5px] font-semibold transition-colors sm:-mb-px ${
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
