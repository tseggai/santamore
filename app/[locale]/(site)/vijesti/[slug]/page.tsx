import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PostArticle } from "@/components/news/PostArticle";
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

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <PostArticle
        title={post.title}
        dateLabel={dateFormat.format(new Date(post.published_at))}
        coverPath={post.cover_path}
        bodyMd={post.body_md}
      />

      <Link
        href="/vijesti"
        className="mt-10 inline-block rounded-lg bg-mist px-5 py-3 text-sm font-semibold hover:bg-mist-2 hover:text-sea"
      >
        ← {t("backToIndex")}
      </Link>
    </article>
  );
}
