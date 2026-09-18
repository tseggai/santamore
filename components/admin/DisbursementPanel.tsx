"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { DisbursementForm, type CauseOption, type ChapterOption } from "@/components/admin/DisbursementForm";
import { SidePanel } from "@/components/console/SidePanel";

/**
 * "+ New disbursement" opens the draft form in a slide-over over the lists.
 * A year report's "Record a hand-over" link lands here with the cause
 * preset, so the panel starts open.
 */
export function DisbursementPanel({ chapters, causes, initialCauseId = "" }: { chapters: ChapterOption[]; causes: CauseOption[]; initialCauseId?: string }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(initialCauseId !== "");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark"
      >
        + {t("disbNew")}
      </button>
      <SidePanel open={open} title={t("disbNewHeading")} onClose={() => setOpen(false)}>
        <DisbursementForm key={String(open)} chapters={chapters} causes={causes} initialCauseId={initialCauseId} onDone={() => setOpen(false)} />
      </SidePanel>
    </>
  );
}
