"use client";

import { useState, type ReactNode } from "react";

/**
 * A list that shows its first `limit` items and a "Show all N" toggle —
 * the same treatment for rewards, challenges and activities, so a runner
 * with three of something and one with three hundred get the same page.
 */
export function Expandable({
  items,
  limit,
  moreLabel,
  lessLabel,
  className,
}: {
  items: ReactNode[];
  limit: number;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? items : items.slice(0, limit);
  return (
    <>
      <ul className={className}>{visible}</ul>
      {items.length > limit ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-2 text-[14px] font-semibold text-sea underline underline-offset-2"
        >
          {open ? lessLabel : moreLabel}
        </button>
      ) : null}
    </>
  );
}
