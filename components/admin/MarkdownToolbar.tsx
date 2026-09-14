"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type RefObject } from "react";

import { ImageIcon } from "@/components/Icons";
import { downscaleToJpeg } from "@/lib/images";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/**
 * Small Markdown helpers above the body field: wrap the selection, start a
 * heading or a list, and drop an image between paragraphs. The image goes to
 * the public gallery bucket and lands as `![caption](url)` at the cursor.
 */
export function MarkdownToolbar({
  textarea,
  value,
  onChange,
  folder,
}: {
  textarea: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  folder: string;
}) {
  const t = useTranslations("admin");
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const edit = (transform: (selected: string) => string, block = false) => {
    const el = textarea.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    let insert = transform(selected);
    if (block && start > 0 && value[start - 1] !== "\n") insert = `\n${insert}`;
    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + insert.length, start + insert.length);
    });
  };

  const insertImage = async (file: File) => {
    setBusy(true);
    try {
      const blob = await downscaleToJpeg(file, 2000);
      const path = `${folder}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("gallery").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const url = galleryImageUrl(path) ?? "";
      edit((selected) => `\n![${selected || ""}](${url})\n`, true);
    } catch {
      // the field is unchanged; nothing to undo
    } finally {
      setBusy(false);
    }
  };

  const button = "rounded-lg bg-paper px-2.5 py-1 text-[13px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-40";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={() => edit((s) => `**${s || t("mdBoldSample")}**`)} className={`${button} font-bold`} aria-label={t("mdBold")} title={t("mdBold")}>B</button>
      <button type="button" onClick={() => edit((s) => `*${s || t("mdItalicSample")}*`)} className={`${button} italic`} aria-label={t("mdItalic")} title={t("mdItalic")}>I</button>
      <button type="button" onClick={() => edit((s) => `## ${s || t("mdHeadingSample")}\n`, true)} className={button} title={t("mdHeading")}>H2</button>
      <button type="button" onClick={() => edit((s) => (s ? s.split("\n").map((line) => `- ${line}`).join("\n") : "- "), true)} className={button} title={t("mdList")}>•</button>
      <button type="button" onClick={() => edit((s) => `[${s || t("mdLinkSample")}](https://)`)} className={button} title={t("mdLink")}>↗</button>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void insertImage(file);
        }}
      />
      <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={`${button} inline-flex items-center gap-1.5`} title={t("mdImage")}>
        <ImageIcon />
        {busy ? t("photoUploading") : t("mdImage")}
      </button>
    </div>
  );
}
