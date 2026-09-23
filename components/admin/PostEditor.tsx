"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { savePostGroup } from "@/app/[locale]/admin/(protected)/sadrzaj/actions";
import { TranslateBar } from "@/components/admin/TranslateBar";
import { CoverField } from "@/components/admin/CoverField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { EyeIcon } from "@/components/Icons";
import { PostArticle } from "@/components/news/PostArticle";
import { formatShortDate } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { routing, type Locale } from "@/i18n/routing";

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

/** One post = the same slug in up to three languages. */
export interface PostGroup {
  slug: string;
  rows: EditablePost[];
}

interface Draft {
  id?: string;
  title: string;
  excerpt: string;
  body: string;
}

type State = "idle" | "busy" | "done" | "error" | "slug";

const inputClass =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-sea";
const labelClass = "text-[13.5px] font-semibold";

function draftFrom(row: EditablePost | undefined): Draft {
  return { id: row?.id, title: row?.title ?? "", excerpt: row?.excerpt ?? "", body: row?.body_md ?? "" };
}

/**
 * Markdown post editor with one tab per site language. Slug, cover and
 * publish state are shared; each language has its own title, excerpt and
 * body, and can be drafted from another language with one click.
 */
export function PostEditor({ group, onSaved }: { group: PostGroup | null; onSaved?: () => void }) {
  const t = useTranslations("admin");
  const uiLocale = useLocale() as Locale;
  const router = useRouter();
  const first = group?.rows[0];
  const [slug, setSlug] = useState(group?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(group));
  const [drafts, setDrafts] = useState<Record<Locale, Draft>>(
    () => Object.fromEntries(routing.locales.map((l) => [l, draftFrom(group?.rows.find((r) => r.locale === l))])) as Record<Locale, Draft>,
  );
  const [tab, setTab] = useState<Locale>(
    (group?.rows.find((r) => r.locale === routing.defaultLocale)?.locale ?? group?.rows[0]?.locale ?? routing.defaultLocale) as Locale,
  );
  const [coverPath, setCoverPath] = useState<string | null>(first?.cover_path ?? null);
  const [coverFolder] = useState(() => `covers/posts/${first?.id ?? `new-${crypto.randomUUID()}`}`);
  const [published] = useState(Boolean(first?.published_at));
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  const draft = drafts[tab];
  const setDraft = (patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [tab]: { ...all[tab], ...patch } }));
  const filled = (l: Locale) => drafts[l].title.trim().length > 0 || drafts[l].body.trim().length > 0;
  const effectiveSlug = slug || slugify(drafts[routing.defaultLocale as Locale].title || draft.title);
  const dateLabel = formatShortDate(first?.published_at ?? new Date().toISOString(), uiLocale);

  const save = async (publish: boolean) => {
    if (state === "busy") return;
    setState("busy");
    setDetail(null);
    const result = await savePostGroup({
      slug: effectiveSlug,
      coverPath,
      published: publish,
      locales: Object.fromEntries(
        routing.locales.map((l) => [l, { id: drafts[l as Locale].id, title: drafts[l as Locale].title, excerpt: drafts[l as Locale].excerpt, bodyMd: drafts[l as Locale].body }]),
      ),
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save(published);
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
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
        <div className="sm:col-span-3">
          <CoverField value={coverPath} onChange={setCoverPath} folder={coverFolder} />
        </div>
      </div>

      {/* Language tabs: filled ones carry a dot. */}
      <div role="tablist" aria-label={t("postLocale")} className="flex flex-wrap gap-1.5 border-b-[0.5px] border-line pb-2">
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={tab === l}
            onClick={() => setTab(l as Locale)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[13px] uppercase tracking-[0.08em] transition-colors ${
              tab === l ? "bg-ink text-paper" : "bg-paper hover:bg-mist-2"
            }`}
          >
            {l}
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${filled(l as Locale) ? (tab === l ? "bg-red" : "bg-sea") : "bg-black/20"}`} />
          </button>
        ))}
      </div>
      <TranslateBar
        source={tab}
        getFields={() => ({ title: draft.title, excerpt: draft.excerpt, body: draft.body })}
        apply={(loc, fields) => setDrafts((all) => ({ ...all, [loc]: { ...all[loc], title: fields.title ?? all[loc].title, excerpt: fields.excerpt ?? all[loc].excerpt, body: fields.body ?? all[loc].body } }))}
      />

      <label className={labelClass}>
        {t("postTitle")}
        <input value={draft.title} onChange={(e) => setDraft({ title: e.target.value })} maxLength={200} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("postExcerpt")}
        <textarea value={draft.excerpt} onChange={(e) => setDraft({ excerpt: e.target.value })} rows={2} maxLength={500} className={inputClass} />
      </label>
      <div>
        <label htmlFor={`postBody-${tab}`} className={labelClass}>{t("postBody")}</label>
        <RichTextEditor key={tab} id={`postBody-${tab}`} value={draft.body} onChange={(body) => setDraft({ body })} folder={`posts/${first?.id ?? "new"}`} />
      </div>

      {state === "error" ? (
        <p role="alert" className="text-[14px] font-semibold text-red-dark">
          {t("actionError")}
          {detail ? <span className="block font-mono text-[12.5px] font-normal text-black/60">{detail}</span> : null}
        </p>
      ) : null}
      {state === "slug" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("postSlugTaken")}</p> : null}
      {state === "done" ? <p className="text-[14px] font-semibold text-sea">{t("postSaved")}</p> : null}

      <PreviewFrame open={preview} onOpenChange={setPreview} liveHref={first?.published_at ? `/vijesti/${group?.slug}` : null}>
        <article className="mx-auto max-w-3xl px-5 py-10">
          <PostArticle title={draft.title} dateLabel={dateLabel} coverPath={coverPath} bodyMd={draft.body} preview />
        </article>
      </PreviewFrame>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center gap-2 border-t-[0.5px] border-black/25 bg-mist px-5 py-3 sm:-mx-6 sm:px-6">
        <button
          type="button"
          aria-pressed={preview}
          aria-label={preview ? t("previewHide") : t("previewShow")}
          title={preview ? t("previewHide") : t("previewShow")}
          onClick={() => setPreview((v) => !v)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${preview ? "bg-ink text-paper" : "bg-paper text-black/70 hover:bg-mist-2 hover:text-sea"}`}
        >
          <EyeIcon />
        </button>
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-lg bg-paper px-5 py-2.5 text-[14.5px] font-bold transition-colors hover:bg-mist-2 disabled:opacity-60"
        >
          {published ? t("evSave") : t("postSaveDraft")}
        </button>
        <button
          type="button"
          disabled={state === "busy"}
          onClick={() => save(!published)}
          className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {published ? t("galleryUnpublish") : t("galleryPublish")}
        </button>
      </div>
    </form>
  );
}
