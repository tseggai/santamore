"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";

export interface NavDropdownItem {
  href: string;
  label: string;
}

/**
 * A desktop nav item that opens a list of pages: click or Enter opens,
 * Escape and a click outside close, arrow keys move through the list.
 */
export function NavDropdown({ label, items, className }: { label: string; items: NavDropdownItem[]; className: string }) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const links = Array.from(rootRef.current?.querySelectorAll<HTMLAnchorElement>("a[role=menuitem]") ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = event.key === "ArrowDown" ? (index + 1) % links.length : (index - 1 + links.length) % links.length;
    links[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onMenuKey}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 ${className}`}
      >
        {label}
        <svg viewBox="0 0 12 12" aria-hidden className={`h-3 w-3 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {open ? (
        <div id={id} role="menu" className="absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 rounded-lg bg-paper p-1.5 shadow-[0_12px_40px_rgba(14,58,70,0.18)]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-[15px] font-semibold text-black transition-colors hover:bg-mist hover:text-sea"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
