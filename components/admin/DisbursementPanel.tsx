"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { DisbursementForm, type ChapterOption } from "@/components/admin/DisbursementForm";
import { SidePanel } from "@/components/console/SidePanel";

/** "+ New disbursement" opens the draft form in a slide-over over the lists. */
export function DisbursementPanel({ chapters }: { chapters: ChapterOption[] }) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);

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
        <DisbursementForm key={String(open)} chapters={chapters} onDone={() => setOpen(false)} />
      </SidePanel>
    </>
  );
}
