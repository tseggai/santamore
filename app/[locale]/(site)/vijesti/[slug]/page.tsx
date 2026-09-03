import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface PostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_path: string | null;
  published_at: string;
  locale: string;
}

async function fetchPost(slug: string, locale: string): Promise<PostRow | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_posts")
      .select("slug, title, excerpt, body_md, cover_path, published_at, locale")
      .eq("slug", slug);
    const rows = (data ?? []) as PostRow[];
    // Prefer the reader's locale, fall back to the default, then to anything.
    return (
      rows.find((row) => row.locale === locale) ??
      rows.find((row) => row.locale === routing.defaultLocale) ??
      rows[0] ??
      null
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await fetchPost(slug, locale);
  if (!post) return {};
  return {
    title: `${post.title} — Santamore`,
    description: post.excerpt ?? undefined,
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("news");
  const post = await fetchPost(slug, locale);
  if (!post) notFound();

  const cover = galleryImageUrl(post.cover_path);
  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[11.5px] text-ink/55">
        {dateFormat.format(new Date(post.published_at))}
      </p>
      <h1 className="type-display mt-2 text-4xl leading-[1.1] sm:text-5xl">{post.title}</h1>
      {cover ? (
        <Image
          src={cover}
          alt=""
          width={1200}
          height={675}
          priority
          className="mt-6 w-full rounded-brand border-[1.5px] border-line object-cover"
        />
      ) : null}

      <div className="prose-news mt-8">
        <Markdown remarkPlugins={[remarkGfm]}>{post.body_md}</Markdown>
      </div>

      <Link
        href="/vijesti"
        className="mt-10 inline-block rounded-xl border-[1.5px] border-line px-5 py-3 text-sm font-semibold hover:border-sea hover:text-sea"
      >
        ← {t("backToIndex")}
      </Link>
    </article>
  );
}
