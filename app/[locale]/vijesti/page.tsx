import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { galleryImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { htmlLang, routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  return { title: `${t("title")} — Santamore` };
}

interface PostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_path: string | null;
  published_at: string;
}

export default async function NewsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("news");

  let posts: PostRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_posts")
      .select("slug, title, excerpt, cover_path, published_at")
      .eq("locale", locale)
      .order("published_at", { ascending: false })
      .limit(50);
    posts = (data ?? []) as PostRow[];
  } catch {
    posts = [];
  }

  const dateFormat = new Intl.DateTimeFormat(htmlLang(locale as Locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sea/80">
        {t("eyebrow")}
      </p>
      <h1 className="type-display mt-3 text-4xl leading-[1.1] sm:text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/70">{t("sub")}</p>

      {posts.length === 0 ? (
        <p className="mt-8 max-w-xl rounded-brand border-[1.5px] border-dashed border-sea bg-mist px-4 py-3 text-[12.5px] text-sea">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {posts.map((post) => {
            const cover = galleryImageUrl(post.cover_path);
            return (
              <li key={post.slug}>
                <Link
                  href={`/vijesti/${post.slug}`}
                  className="flex gap-4 rounded-brand border-[1.5px] border-line p-4 transition-colors hover:border-sea"
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      width={160}
                      height={120}
                      className="hidden h-[92px] w-[124px] shrink-0 rounded-[10px] object-cover sm:block"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="font-mono text-[11.5px] text-ink/55">
                      {dateFormat.format(new Date(post.published_at))}
                    </p>
                    <p className="type-display mt-1 text-xl leading-snug">{post.title}</p>
                    {post.excerpt ? (
                      <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink/65">
                        {post.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
