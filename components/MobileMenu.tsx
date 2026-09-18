"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import LocaleSwitcher from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";

export interface MenuItem {
  href: string;
  label: string;
}

/**
 * The phone menu: one button in the header, a right-hand drawer with the
 * same links as the desktop nav, the console link and the language
 * switcher. A native <dialog> gives Escape, the focus trap and the inert
 * page; the drawer closes itself on every navigation.
 */
export function MobileMenu({
  items,
  consoleItem,
  openLabel,
  closeLabel,
  light = false,
}: {
  items: MenuItem[];
  consoleItem: MenuItem;
  openLabel: string;
  closeLabel: string;
  /** On the transparent header over the landing hero. */
  light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkClass = "block rounded-lg px-3 py-3 text-[17px] font-semibold text-black transition-colors hover:bg-mist";

  return (
    <>
      <button
        type="button"
        aria-label={openLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors md:hidden ${
          light ? "bg-paper/15 text-paper hover:bg-paper/25" : "bg-mist text-black hover:bg-mist-2"
        }`}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" />
        </svg>
      </button>
      <dialog
        id={id}
        ref={dialogRef}
        aria-label={openLabel}
        onClose={() => setOpen(false)}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none justify-end bg-transparent p-0 backdrop:bg-ink/55 open:flex md:hidden"
      >
        {open ? (
          <div className="flex h-full w-[min(100%,320px)] flex-col bg-paper px-4 py-4 shadow-[-16px_0_48px_rgba(14,58,70,0.18)] motion-safe:animate-[panel-in_220ms_ease-out]">
            <div className="flex items-center justify-between">
              <LocaleSwitcher />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-mist text-[20px] leading-none text-black/70 hover:bg-mist-2"
              >
                ×
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-0.5">
              {items.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t-[0.5px] border-line pt-3">
              <Link href={consoleItem.href} className={`${linkClass} text-sea`}>
                {consoleItem.label} →
              </Link>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
