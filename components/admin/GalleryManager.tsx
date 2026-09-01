"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  addGalleryItems,
  deleteGalleryItem,
  setGalleryPublished,
} from "@/app/[locale]/admin/(protected)/sadrzaj/actions";
import { downscaleToJpeg } from "@/lib/images";
import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export interface GalleryAdminItem {
  id: string;
  storage_path: string;
  caption: string | null;
  credit: string | null;
  is_published: boolean;
  event_id: string | null;
}

export interface EventOption {
  id: string;
  name: string;
}

type State = "idle" | "busy" | "error";

const inputClass =
  "mt-1 w-full rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-sea";

/**
 * Batch photo upload (downscaled client-side) plus the publish/take-down
 * list. Deleting removes the file too — consent withdrawal must be total.
 */
export function GalleryManager({
  items,
  events,
}: {
  items: GalleryAdminItem[];
  events: EventOption[];
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const blob = await downscaleToJpeg(file, 2000);
        const path = `photos/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("gallery")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (!error) uploaded.push(path);
      } catch {
        // skip unreadable file, keep the batch going
      }
    }
    setPaths((existing) => [...existing, ...uploaded]);
    setUploading(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paths.length === 0) return;
    const form = new FormData(event.currentTarget);
    setState("busy");
    const eventId = String(form.get("event") ?? "");
    const result = await addGalleryItems({
      eventId: eventId === "" ? null : eventId,
      caption: String(form.get("caption") ?? ""),
      credit: String(form.get("credit") ?? ""),
      publish: form.get("publish") === "on",
      paths,
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

  const toggle = async (item: GalleryAdminItem) => {
    setRowBusy(item.id);
    await setGalleryPublished({ itemId: item.id, published: !item.is_published }).catch(
      () => ({ ok: false }),
    );
    setRowBusy(null);
    router.refresh();
  };

  const remove = async (item: GalleryAdminItem) => {
    setRowBusy(item.id);
    await deleteGalleryItem({ itemId: item.id }).catch(() => ({ ok: false }));
    setRowBusy(null);
    router.refresh();
  };

  return (
    <div className="mt-4">
      <form onSubmit={submit} className="grid max-w-xl gap-3">
        <label className="block">
          <span className="text-[13px] font-semibold">{t("galleryFiles")}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onFiles}
            disabled={uploading}
            className="mt-1 block text-[13.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-sea file:px-4 file:py-2 file:font-semibold file:text-paper"
          />
        </label>
        {paths.length > 0 ? (
          <p className="font-mono text-[12px] text-sea">
            {t("galleryUploaded", { count: paths.length })}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-[13px] font-semibold">
            {t("galleryEvent")}
            <select name="event" className={inputClass}>
              <option value="">—</option>
              {events.map((eventOption) => (
                <option key={eventOption.id} value={eventOption.id}>
                  {eventOption.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-semibold">
            {t("galleryCaption")}
            <input name="caption" maxLength={300} className={inputClass} />
          </label>
          <label className="text-[13px] font-semibold">
            {t("galleryCredit")}
            <input name="credit" maxLength={120} className={inputClass} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13.5px] font-semibold">
          <input type="checkbox" name="publish" defaultChecked className="h-4 w-4 accent-sea" />
          {t("galleryPublishNow")}
        </label>
        <button
          type="submit"
          disabled={state === "busy" || uploading || paths.length === 0}
          className="rounded-xl bg-sea px-5 py-3 text-[14px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-50"
        >
          {t("gallerySave")}
        </button>
        {state === "error" ? (
          <p role="alert" className="text-[13px] font-semibold text-red-dark">
            {t("actionError")}
          </p>
        ) : null}
      </form>

      {items.length > 0 ? (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => {
            const src = galleryImageUrl(item.storage_path);
            return (
              <li
                key={item.id}
                className={`rounded-brand border-[1.5px] p-2 ${
                  item.is_published ? "border-line" : "border-line-soft opacity-60"
                }`}
              >
                {src ? (
                  <Image
                    src={src}
                    alt={item.caption ?? ""}
                    width={240}
                    height={180}
                    className="aspect-[4/3] w-full rounded-[8px] object-cover"
                  />
                ) : null}
                <p className="mt-1 truncate text-[11.5px] text-ink/60">
                  {item.caption ?? "—"}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={rowBusy === item.id}
                    onClick={() => toggle(item)}
                    className="rounded-lg border-[1.5px] border-line px-2 py-0.5 text-[11.5px] font-semibold hover:border-sea hover:text-sea disabled:opacity-40"
                  >
                    {item.is_published ? t("galleryUnpublish") : t("galleryPublish")}
                  </button>
                  <button
                    type="button"
                    disabled={rowBusy === item.id}
                    onClick={() => remove(item)}
                    className="rounded-lg px-1.5 py-0.5 text-[11.5px] font-semibold text-ink/50 hover:text-red-dark disabled:opacity-40"
                  >
                    {t("galleryDelete")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
