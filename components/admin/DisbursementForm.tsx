"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { createDisbursement } from "@/app/[locale]/admin/(protected)/isplate/actions";
import { parseEurosToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";

export interface ChapterOption {
  id: string;
  name: string;
}

type State = "idle" | "busy" | "error";

const inputClass =
  "mt-1 w-full rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-sea";

/**
 * New-disbursement form. Documentation files upload straight to the
 * disbursement-docs bucket (staff-only write policy) before the insert, so
 * the row is born with its proof attached.
 */
export function DisbursementForm({ chapters }: { chapters: ChapterOption[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [uploading, setUploading] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const uploaded: string[] = [];
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("disbursement-docs")
        .upload(path, file, { contentType: file.type });
      if (!error) uploaded.push(path);
    }
    setPaths((existing) => [...existing, ...uploaded]);
    setUploading(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountCents = parseEurosToCents(String(form.get("amount") ?? ""));
    if (amountCents === null) {
      setState("error");
      return;
    }
    setState("busy");
    const decidedRaw = String(form.get("decided") ?? "");
    const result = await createDisbursement({
      chapterId: String(form.get("chapter") ?? ""),
      label: String(form.get("label") ?? ""),
      privateNote: String(form.get("note") ?? ""),
      category: String(form.get("category") ?? ""),
      amountCents,
      committeeRef: String(form.get("committee") ?? ""),
      ...(decidedRaw ? { decidedAtIso: new Date(`${decidedRaw}T12:00:00Z`).toISOString() } : {}),
      documentationPaths: paths,
    }).catch(() => ({ ok: false }));
    if (result.ok) {
      setPaths([]);
      setState("idle");
      (event.target as HTMLFormElement).reset?.();
      router.refresh();
    } else {
      setState("error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid max-w-xl gap-3">
      <label className="text-[13px] font-semibold">
        {t("disbChapter")}
        <select name="chapter" required className={inputClass}>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[13px] font-semibold">
        {t("disbLabel")}
        <input
          name="label"
          required
          minLength={3}
          maxLength={200}
          placeholder={t("disbLabelHint")}
          className={inputClass}
        />
      </label>
      <label className="text-[13px] font-semibold">
        {t("disbNote")}
        <textarea name="note" rows={2} maxLength={2000} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[13px] font-semibold">
          {t("disbAmount")}
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="0,00"
            className={`${inputClass} font-mono tabular-nums`}
          />
        </label>
        <label className="text-[13px] font-semibold">
          {t("disbCategory")}
          <input name="category" maxLength={80} className={inputClass} />
        </label>
        <label className="text-[13px] font-semibold">
          {t("disbDecided")}
          <input name="decided" type="date" className={inputClass} />
        </label>
      </div>
      <label className="text-[13px] font-semibold">
        {t("disbCommittee")}
        <input name="committee" maxLength={120} className={inputClass} />
      </label>

      <div>
        <span className="text-[13px] font-semibold">{t("disbDocs")}</span>
        <label className="mt-1 block">
          <span className="sr-only">{t("disbDocs")}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onFiles}
            disabled={uploading}
            className="text-[13.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-sea file:px-4 file:py-2 file:font-semibold file:text-paper"
          />
        </label>
        {paths.length > 0 ? (
          <p className="mt-1 font-mono text-[12px] text-sea">
            {t("disbDocsCount", { count: paths.length })}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={state === "busy" || uploading}
        className="rounded-xl bg-sea px-5 py-3 text-[14px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-50"
      >
        {t("disbCreate")}
      </button>
      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
    </form>
  );
}
