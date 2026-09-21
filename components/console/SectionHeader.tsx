import type { ReactNode } from "react";

/**
 * The header of a console section: title and hint on the left, a slot on
 * the title line for the screen's primary action (filled by HeaderAction
 * from the page's manager), the section's tabs beneath.
 */
export function SectionHeader({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-2xl flex-1">
          <h1 className="type-display text-2xl">{title}</h1>
          {hint ? <p className="mt-1 text-[14px] leading-relaxed text-black/60">{hint}</p> : null}
        </div>
        <div data-header-action className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1" />
      </div>
      {children}
    </div>
  );
}
