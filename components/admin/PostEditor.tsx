"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { savePost } from "@/app/[locale]/admin/(protected)/sadrzaj/actions";
import { downscaleToJpeg } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { routing } from "@/i18n/routing";

export interface EditablePost {
  id: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  cover_path: string | null;
  published_at: string | null;
}

type State = "idle" | "busy" | "done" | "error";

const inputClass =
  "mt-1 w-full rounded-[10px] border-[1.5px] border-line bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-sea";

/** Markdown post editor — one row per locale, same slug links translations. */
export function PostEditor({ post }: { post: EditablePost | null }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [coverPath, setCoverPath] = useState(post?.cover_path ?? "");
  const [uploading, setUploading] = useState(false);

  const onCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const blob = await downscaleToJpeg(file, 2000);
      const path = `covers/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("gallery")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (!error) setCoverPath(path);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("busy");
    const result = await savePost({
      ...(post ? { id: post.id } : {}),
      locale: String(form.get("locale") ?? routing.defaultLocale),
      slug: String(form.get("slug") ?? ""),
      title: String(form.get("title") ?? ""),
      excerpt: String(form.get("excerpt") ?? ""),
      bodyMd: String(form.get("body") ?? ""),
      coverPath,
      published: form.get("published") === "on",
    }).catch(() => ({ ok: false }));
    setState(result.ok ? "done" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-4 grid max-w-2xl gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[13px] font-semibold">
          {t("postLocale")}
          <select
            name="locale"
            defaultValue={post?.locale ?? routing.defaultLocale}
            className={inputClass}
          >
            {routing.locales.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-semibold sm:col-span-2">
          {t("postSlug")}
          <input
            name="slug"
            required
            defaultValue={post?.slug ?? ""}
            maxLength={120}
            className={`${inputClass} font-mono`}
          />
        </label>
      </div>
      <label className="text-[13px] font-semibold">
        {t("postTitle")}
        <input
          name="title"
          required
          minLength={3}
          maxLength={200}
          defaultValue={post?.title ?? ""}
          className={inputClass}
        />
      </label>
      <label className="text-[13px] font-semibold">
        {t("postExcerpt")}
        <textarea
          name="excerpt"
          rows={2}
          maxLength={500}
          defaultValue={post?.excerpt ?? ""}
          className={inputClass}
        />
      </label>
      <label className="text-[13px] font-semibold">
        {t("postBody")}
        <textarea
          name="body"
          required
          rows={14}
          maxLength={50000}
          defaultValue={post?.body_md ?? ""}
          className={`${inputClass} font-mono text-[13px]`}
        />
      </label>

      <div>
        <span className="text-[13px] font-semibold">{t("postCover")}</span>
        <label className="mt-1 block">
          <span className="sr-only">{t("postCover")}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onCover}
            disabled={uploading}
            className="text-[13.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-sea file:px-4 file:py-2 file:font-semibold file:text-paper"
          />
        </label>
        {coverPath ? (
          <p className="mt-1 font-mono text-[12px] text-sea">{coverPath}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-[13.5px] font-semibold">
        <input
          type="checkbox"
          name="published"
          defaultChecked={post?.published_at !== null && post !== null}
          className="h-4 w-4 accent-sea"
        />
        {t("postPublished")}
      </label>

      <button
        type="submit"
        disabled={state === "busy" || uploading}
        className="rounded-xl bg-sea px-5 py-3 text-[14px] font-bold text-paper transition-colors hover:bg-sea-2 disabled:opacity-50"
      >
        {t("postSave")}
      </button>
      {state === "done" ? (
        <p className="text-[13px] font-semibold text-sea">{t("postSaved")}</p>
      ) : null}
      {state === "error" ? (
        <p role="alert" className="text-[13px] font-semibold text-red-dark">
          {t("actionError")}
        </p>
      ) : null}
    </form>
  );
}
