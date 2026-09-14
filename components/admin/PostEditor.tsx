"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { savePost } from "@/app/[locale]/admin/(protected)/sadrzaj/actions";
import { CoverField } from "@/components/admin/CoverField";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { PostArticle } from "@/components/news/PostArticle";
import { slugify } from "@/lib/slug";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

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

type State = "idle" | "busy" | "done" | "error" | "slug";

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";

/** Markdown post editor — one row per locale, same slug links translations. */
export function PostEditor({ post, onSaved }: { post: EditablePost | null; onSaved?: () => void }) {
  const t = useTranslations("admin");
  const uiLocale = useLocale() as Locale;
  const router = useRouter();
  const [locale, setLocale] = useState<string>(post?.locale ?? routing.defaultLocale);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body_md ?? "");
  const [coverPath, setCoverPath] = useState<string | null>(post?.cover_path ?? null);
  const [coverFolder] = useState(() => `covers/posts/${post?.id ?? `new-${crypto.randomUUID()}`}`);
  const [published, setPublished] = useState(Boolean(post?.published_at));
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  const effectiveSlug = slug || slugify(title);
  const dateLabel = new Intl.DateTimeFormat(htmlLang(uiLocale), { day: "numeric", month: "long", year: "numeric" }).format(
    post?.published_at ? new Date(post.published_at) : new Date(),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("busy");
    setDetail(null);
    const result = await savePost({
      ...(post ? { id: post.id } : {}),
      locale,
      slug: effectiveSlug,
      title,
      excerpt,
      bodyMd: body,
      coverPath: coverPath ?? "",
      published,
    }).catch(() => ({ ok: false, detail: "network" }));
    if (result.ok) {
      setState("done");
      router.refresh();
      onSaved?.();
    } else {
      setState(result.detail === "slug" ? "slug" : "error");
      setDetail(result.detail ?? null);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          {t("postLocale")}
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className={inputClass}>
            {routing.locales.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          {t("postSlug")}
          <input
            value={slugTouched ? slug : effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            maxLength={120}
            className={`${inputClass} font-mono`}
          />
        </label>
      </div>
      <label className={labelClass}>
        {t("postTitle")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("postExcerpt")}
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} maxLength={500} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("postBody")}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={14}
          maxLength={50000}
          className={`${inputClass} font-mono text-[14px]`}
        />
      </label>

      <CoverField value={coverPath} onChange={setCoverPath} folder={coverFolder} />

      <label className="flex items-center gap-2 text-[14.5px] font-semibold">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-red" />
        {t("postPublished")}
      </label>

      {state === "error" ? (
        <p role="alert" className="text-[14px] font-semibold text-red-dark">
          {t("actionError")}
          {detail ? <span className="block font-mono text-[12.5px] font-normal text-black/60">{detail}</span> : null}
        </p>
      ) : null}
      {state === "slug" ? (
        <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("postSlugTaken")}</p>
      ) : null}
      {state === "done" ? <p className="text-[14px] font-semibold text-sea">{t("postSaved")}</p> : null}

      <PreviewFrame liveHref={post?.published_at ? `/vijesti/${post.slug}` : null}>
        <article className="mx-auto max-w-3xl px-5 py-10">
          <PostArticle title={title} dateLabel={dateLabel} coverPath={coverPath} bodyMd={body} preview />
        </article>
      </PreviewFrame>

      <div className="sticky bottom-0 -mx-5 flex gap-2 border-t-[0.5px] border-line bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {t("postSave")}
        </button>
      </div>
    </form>
  );
}
