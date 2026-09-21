import type { ReactNode } from "react";

import { HeaderAction } from "@/components/console/HeaderAction";

/**
 * Console screen header: display title, one-line lead, primary action top
 * right. Inside a section whose layout already draws the title (a
 * SectionHeader), pass no title: the action alone goes up to that header.
 */
export function PageHeader({
  title,
  lead,
  action,
}: {
  title?: string;
  lead?: string;
  action?: ReactNode;
}) {
  if (!title && !lead) return action ? <HeaderAction>{action}</HeaderAction> : null;
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-2xl flex-1">
        <h1 className="type-display text-2xl">{title}</h1>
        {lead ? <p className="mt-1 text-[14px] leading-relaxed text-black/60">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0 sm:pt-1">{action}</div> : null}
    </div>
  );
}
