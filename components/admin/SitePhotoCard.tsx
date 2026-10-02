"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { setSitePhoto, type SitePhotoKey } from "@/app/[locale]/admin/(protected)/sadrzaj/actions";
import { describeUploadError, downscaleToJpeg } from "@/lib/images";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const PHOTOS: Record<SitePhotoKey, { folder: string; file: string; maxEdge: number; aspect: string }> = {
  // The landing slide: 16:9, big.
  home_photo: { folder: "home", file: "hero", maxEdge: 2000, aspect: "aspect-[16/9]" },
  // The share card: networks show 1.91:1 (1200×630), so the preview crops the same way.
  share_photo: { folder: "share", file: "card", maxEdge: 1600, aspect: "aspect-[1200/630]" },
};

/** One site-wide photo, in the gallery bucket, named in site settings: the landing slide or the social share card. */
export function SitePhotoCard({ setting, path, title, hint }: { setting: SitePhotoKey; path: string | null; title: string; hint?: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = galleryImageUrl(path);
  const spec = PHOTOS[setting];

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const blob = await downscaleToJpeg(file, spec.maxEdge);
      const next = `${spec.folder}/${spec.file}-${Date.now()}.jpg`;
      const { error: uploadError } = await createClient().storage.from("gallery").upload(next, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const result = await setSitePhoto({ key: setting, path: next });
      if (!result.ok) throw new Error(result.detail ?? "save");
      router.refresh();
    } catch (cause) {
      const { key, detail } = describeUploadError(cause);
      setError(t(key, { detail }));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const result = await setSitePhoto({ key: setting, path: null }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!result.ok) setError(t("actionError"));
    else router.refresh();
  };

  return (
    <section className="rounded-lg bg-mist px-5 py-5">
      <h2 className="text-[16px] font-bold">{title}</h2>
      {hint ? <p className="mt-1 max-w-prose text-[14px] text-black/60">{hint}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {src ? <Image src={src} alt="" width={320} height={180} className={`${spec.aspect} w-64 rounded-lg bg-paper object-cover`} /> : null}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg bg-ink px-4 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? "…" : src ? t("homePhotoReplace") : t("homePhotoAdd")}
        </button>
        {src ? (
          <button type="button" disabled={busy} onClick={() => void remove()} className="rounded-lg bg-paper px-4 py-2.5 text-[14.5px] font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-60">
            {t("homePhotoRemove")}
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{error}</p> : null}
    </section>
  );
}
