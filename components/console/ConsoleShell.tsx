"use client";

import Image, { type StaticImageData } from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

/**
 * The shell shared by the runner console and the admin: an ink or sea
 * rail with the icon mark, the console badge, the nav and the footer
 * actions. Desktop keeps the rail beside the work surface; on a phone
 * the rail becomes a top bar with a menu button that slides the same
 * rail in as a drawer (native <dialog>, so Escape, focus and the inert
 * page come for free). The drawer closes on every navigation.
 */
export function ConsoleShell({
  tone,
  icon,
  homeHref,
  badge,
  nav,
  footer,
  menuLabel,
  closeLabel,
  width = "max-w-4xl",
  children,
}: {
  tone: "ink" | "sea";
  icon: StaticImageData;
  homeHref: string;
  badge: string;
  nav: ReactNode;
  footer: ReactNode;
  menuLabel: string;
  closeLabel: string;
  /** Tailwind max-width for the work surface. */
  width?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A tap on a nav link navigates; the drawer must not linger over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const bg = tone === "ink" ? "bg-ink" : "bg-sea";

  const rail = (
    <>
      <div className="hidden md:block">
        <Link href={homeHref} className="block w-fit">
          <Image src={icon} alt="Santamore" className="h-14 w-auto" priority />
        </Link>
        <span className="mt-5 inline-block rounded-full border border-paper/30 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/80">
          {badge}
        </span>
      </div>
      {nav}
      <div className="flex flex-col gap-2.5 border-t border-paper/15 pt-4 md:mt-auto">{footer}</div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-mist md:flex-row">
      {/* phone: top bar */}
      <header className={`flex items-center justify-between gap-3 px-4 py-3 text-paper md:hidden ${bg}`}>
        <Link href={homeHref} className="inline-flex items-center gap-2.5">
          <Image src={icon} alt="Santamore" className="h-9 w-auto" priority />
          <span className="rounded-full border border-paper/30 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/80">
            {badge}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={menuLabel}
          aria-haspopup="dialog"
          aria-controls={drawerId}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-paper/30 text-paper"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </header>

      {/* phone: drawer */}
      <dialog
        id={drawerId}
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/55 open:block md:hidden"
      >
        <div className={`flex h-full w-[min(84vw,20rem)] flex-col gap-5 overflow-y-auto px-5 py-5 text-paper ${bg}`}>
          <div className="flex items-center justify-between gap-3">
            <Link href={homeHref} className="inline-block">
              <Image src={icon} alt="Santamore" className="h-12 w-auto" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-paper/30 text-[21px] leading-none"
            >
              ×
            </button>
          </div>
          <span className="inline-block self-start rounded-full border border-paper/30 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/80">
            {badge}
          </span>
          {nav}
          <div className="mt-auto flex flex-col gap-2.5 border-t border-paper/15 pt-4">{footer}</div>
        </div>
      </dialog>

      {/* desktop: rail */}
      <aside className={`hidden flex-col gap-6 px-5 py-7 text-paper md:flex md:min-h-screen md:w-60 md:shrink-0 ${bg}`}>
        {rail}
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">
        <div className={`mx-auto ${width} rounded-lg bg-paper px-5 md:px-8`}>
          {children}
        </div>
      </main>
    </div>
  );
}
