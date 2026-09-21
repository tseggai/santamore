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
import { SidePanel } from "@/components/console/SidePanel";
import { useDialog } from "@/components/console/useDialog";
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
  campaign_id?: string | null;
}

/** Where a batch belongs: an event, a cause, or nothing (loose photos). */
export interface GalleryScope {
  eventId?: string;
  campaignId?: string;
}

type State = "idle" | "busy" | "error";

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";

/**
 * Photos of one event or cause (or the loose ones on the Content screen):
 * batch upload (downscaled client-side) plus publish/take-down. Deleting
 * removes the file too — consent withdrawal must be total. Inline inside a
 * form panel, or behind an "Add photos" button that opens its own panel.
 */
export function GalleryManager({
  items,
  scope = {},
  inline = false,
}: {
  items: GalleryAdminItem[];
  scope?: GalleryScope;
  inline?: boolean;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const dialog = useDialog();
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(inline);

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
    const result = await addGalleryItems({
      eventId: scope.eventId ?? null,
      campaignId: scope.campaignId ?? null,
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
      if (!inline) setOpen(false);
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
    if (!(await dialog.confirm(t("galleryDeleteConfirm")))) return;
    setRowBusy(item.id);
    await deleteGalleryItem({ itemId: item.id }).catch(() => ({ ok: false }));
    setRowBusy(null);
    router.refresh();
  };

  const form = (
    <form onSubmit={submit} className={`grid gap-3 ${inline ? "rounded-lg bg-paper p-4" : ""}`}>
      <label className="block">
        <span className="text-[14px] font-semibold">{t("galleryFiles")}</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onFiles}
          disabled={uploading}
          className="mt-1 block text-[14.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-sea file:px-4 file:py-2 file:font-semibold file:text-paper"
        />
      </label>
      {paths.length > 0 ? (
        <p className="font-mono text-[13px] text-sea">
          {t("galleryUploaded", { count: paths.length })}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[14px] font-semibold">
          {t("galleryCaption")}
          <input name="caption" maxLength={300} className={inputClass} />
        </label>
        <label className="text-[14px] font-semibold">
          {t("galleryCredit")}
          <input name="credit" maxLength={120} className={inputClass} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[14.5px] font-semibold">
        <input type="checkbox" name="publish" defaultChecked className="h-4 w-4 accent-sea" />
        {t("galleryPublishNow")}
      </label>
      <div>
        <button
          type="submit"
          disabled={state === "busy" || uploading || paths.length === 0}
          className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t("gallerySave")}
        </button>
      </div>
      {state === "error" ? (
        <p role="alert" className="text-[14px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
    </form>
  );

  return (
    <div className={inline ? "" : "mt-4"}>
      {dialog.element}
      {inline ? (
        form
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-red px-4 py-2.5 text-[14.5px] font-bold text-paper transition-colors hover:bg-red-dark"
          >
            + {t("galleryAdd")}
          </button>
          <SidePanel open={open} title={t("galleryAdd")} onClose={() => setOpen(false)}>
            {form}
          </SidePanel>
        </>
      )}

      {items.length > 0 ? (
        <ul className={`mt-4 grid grid-cols-2 gap-3 ${inline ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
          {items.map((item) => {
            const src = galleryImageUrl(item.storage_path);
            return (
              <li key={item.id} className="overflow-hidden rounded-lg bg-paper">
                {src ? (
                  <Image
                    src={src}
                    alt={item.caption ?? ""}
                    width={400}
                    height={300}
                    className="aspect-[4/3] w-full bg-mist object-cover"
                  />
                ) : null}
                <div className="px-3 py-2 text-[13px]">
                  <p className="truncate text-black/70">{item.caption || "—"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={rowBusy === item.id}
                      onClick={() => toggle(item)}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition-colors disabled:opacity-50 ${
                        item.is_published ? "bg-mist hover:bg-mist-2" : "bg-sea text-paper hover:bg-sea-2"
                      }`}
                    >
                      {item.is_published ? t("galleryUnpublish") : t("galleryPublish")}
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy === item.id}
                      onClick={() => remove(item)}
                      className="rounded-lg bg-mist px-2.5 py-1 font-semibold text-red-dark transition-colors hover:bg-mist-2 disabled:opacity-50"
                    >
                      {t("galleryDelete")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : inline ? (
        <p className="mt-3 text-[14px] text-black/60">{t("galleryEmptyScoped")}</p>
      ) : null}
    </div>
  );
}
