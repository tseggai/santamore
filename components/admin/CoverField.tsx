"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { describeUploadError, downscaleToJpeg } from "@/lib/images";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/**
 * Featured image for an event or a cause. The file is downscaled in the
 * browser and lands in the public gallery bucket (staff-only write); the
 * path is saved with the form, so nothing is written until Save.
 */
export function CoverField({
  value,
  onChange,
  folder,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  /** Bucket folder, e.g. `covers/events/<id>`. */
  folder: string;
}) {
  const t = useTranslations("admin");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const src = galleryImageUrl(value);

  const upload = async (file: File) => {
    setBusy(true);
    setFailed(null);
    try {
      const blob = await downscaleToJpeg(file, 2000);
      const path = `${folder}/cover-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("gallery").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      onChange(path);
    } catch (error) {
      const why = describeUploadError(error);
      setFailed(why.key === "uploadFailed" ? t(why.key, { detail: why.detail }) : t(why.key));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-[13.5px] font-semibold">{t("coverLabel")}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {src ? (
          <Image src={src} alt="" width={240} height={135} className="h-[90px] w-40 rounded-lg bg-paper object-cover" />
        ) : (
          <span className="flex h-[90px] w-40 items-center justify-center rounded-lg bg-paper text-[13px] text-black/40">{t("coverNone")}</span>
        )}
        <div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg bg-paper px-3 py-1.5 text-[13.5px] font-semibold transition-colors hover:bg-mist-2 disabled:opacity-60">
              {busy ? t("photoUploading") : src ? t("coverReplace") : t("coverChoose")}
            </button>
            {src ? (
              <button type="button" disabled={busy} onClick={() => onChange(null)} className="text-[13px] font-semibold text-black/60 underline underline-offset-2 hover:text-sea">
                {t("suLogoRemove")}
              </button>
            ) : null}
          </div>
          <p className={`mt-1 text-[13px] ${failed ? "font-semibold text-red-dark" : "text-black/55"}`}>{failed ?? t("coverHint")}</p>
        </div>
      </div>
    </div>
  );
}
