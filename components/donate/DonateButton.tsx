"use client";

import type { MouseEvent, ReactNode } from "react";

import { useDonate } from "@/components/donate/DonateDialog";
import type { DonateRequest } from "@/lib/donate/types";
import { Link } from "@/i18n/navigation";

/**
 * A Donate call to action. It is a real link to the checkout page, so it
 * works without JavaScript, from a new tab, or outside the public site;
 * with the overlay available a plain click opens the three-step flow in
 * place instead.
 */
export function DonateButton({
  request,
  href,
  className,
  children,
}: {
  request: DonateRequest;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const donate = useDonate();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!donate) return;
    // Let modified clicks (new tab, etc.) behave like any link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    donate.open(request);
  };

  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
