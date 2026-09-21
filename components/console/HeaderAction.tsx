"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A screen's primary action, shown on the section header's title line.
 * The header (a server component in the section layout) leaves a slot
 * marked data-header-action; the action lives in the client manager that
 * owns its state, so it is portalled up once mounted. With no slot on the
 * page it renders where it is, right-aligned.
 */
export function HeaderAction({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => {
    setSlot(document.querySelector("[data-header-action]"));
  }, []);
  if (slot) return createPortal(children, slot);
  return <div className="flex justify-end">{children}</div>;
}
