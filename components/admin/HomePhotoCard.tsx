"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { setHomePhoto } from "@/app/[locale]/admin/(protected)/sadrzaj/actions";
import { downscaleToJpeg } from "@/lib/images";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/** The picture on the landing page's opening slide: one photo, in the gallery bucket, named in site settings. */
export function HomePhotoCard({ path }: { path: string | null }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const src = galleryImageUrl(path);

  const upload = async (file: File) => {
    setBusy(true);
    setError(false);
    try {
      const blob = await downscaleToJpeg(file, 2000);
      const next = `home/hero-${Date.now()}.jpg`;
      const { error: uploadError } = await createClient().storage.from("gallery").upload(next, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const result = await setHomePhoto({ path: next });
      if (!result.ok) throw new Error("save");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(false);
    const result = await setHomePhoto({ path: null }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!result.ok) setError(true);
    else router.refresh();
  };

  return (
    <section className="rounded-lg bg-mist px-5 py-5">
      <h2 className="text-[16px] font-bold">{t("homePhotoTitle")}</h2>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("homePhotoHint")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {src ? <Image src={src} alt="" width={320} height={180} className="aspect-[16/9] w-64 rounded-lg bg-paper object-cover" /> : null}
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
      {error ? <p role="alert" className="mt-3 text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
    </section>
  );
}
