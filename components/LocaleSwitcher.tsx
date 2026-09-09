"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Flag } from "@/components/Flags";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = {
  me: "Crnogorski",
  en: "English",
  ru: "Русский",
};

/**
 * Flag button that opens a small menu of languages. Keyboard: Enter/Space
 * or ArrowDown opens, arrows move, Escape closes, Tab leaves. Click-outside
 * closes. Each item is a real link so it works without JS-driven routing.
 */
export default function LocaleSwitcher({
  variant = "light",
}: {
  /** "dark" sits on the sea footer. */
  variant?: "light" | "dark";
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const focusItem = (index: number) => {
    const items = itemRefs.current.filter(Boolean);
    const next = (index + items.length) % items.length;
    items[next]?.focus();
  };

  const onButtonKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      // Items render on the next paint.
      requestAnimationFrame(() =>
        focusItem(event.key === "ArrowDown" ? 0 : routing.locales.length - 1),
      );
    }
  };

  const onMenuKey = (event: KeyboardEvent) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      (rootRef.current?.querySelector("button") as HTMLButtonElement | null)?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const dark = variant === "dark";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t("languageSwitcher")}: ${LABELS[locale]}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKey}
        className={`inline-flex items-center gap-1.5 rounded-lg border-[1.5px] px-2 py-1.5 transition-colors ${
          dark
            ? "border-paper/30 text-paper hover:border-paper"
            : "border-line text-ink/80 hover:border-sea hover:text-sea"
        }`}
      >
        <Flag locale={locale} className="h-[14px] w-[21px] rounded-[2px]" />
        <span className="font-mono text-[11px] uppercase tracking-wider">{locale}</span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5 L6 8.5 L10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("languageSwitcher")}
          onKeyDown={onMenuKey}
          className={`absolute z-40 mt-1.5 min-w-[160px] overflow-hidden rounded-[11px] border-[1.5px] bg-paper py-1 shadow-[0_8px_24px_rgba(54,67,75,0.14)] ${
            dark ? "bottom-full left-0 mb-1.5 mt-0 border-line" : "right-0 border-line"
          }`}
        >
          {routing.locales.map((candidate, index) => {
            const active = candidate === locale;
            return (
              <Link
                key={candidate}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                href={pathname}
                locale={candidate}
                role="menuitem"
                aria-current={active ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink transition-colors hover:bg-mist focus-visible:bg-mist ${
                  active ? "font-semibold" : ""
                }`}
              >
                <Flag locale={candidate} className="h-[14px] w-[21px] rounded-[2px]" />
                <span>{LABELS[candidate]}</span>
                {active ? (
                  <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-red" />
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
