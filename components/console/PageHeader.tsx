import type { ReactNode } from "react";

/** Console screen header: display title, one-line lead, primary action top right. */
export function PageHeader({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
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
