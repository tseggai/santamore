import { getTranslations } from "next-intl/server";

import {
  GalleryManager,
  type EventOption,
  type GalleryAdminItem,
} from "@/components/admin/GalleryManager";
import { PostEditor, type EditablePost } from "@/components/admin/PostEditor";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  const { post: postId } = await searchParams;
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: postsData }, { data: galleryData }, { data: eventsData }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, locale, slug, title, excerpt, body_md, cover_path, published_at")
        .order("published_at", { ascending: false, nullsFirst: true })
        .limit(100),
      supabase
        .from("gallery_items")
        .select("id, storage_path, caption, credit, is_published, event_id")
        .order("sort_order", { ascending: false })
        .limit(120),
      supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
    ]);

  const posts = (postsData ?? []) as EditablePost[];
  const gallery = (galleryData ?? []) as GalleryAdminItem[];
  const events = (eventsData ?? []) as EventOption[];
  const editing = posts.find((candidate) => candidate.id === postId) ?? null;

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("contentTitle")}</h1>

      <h2 className="mt-6 text-[15px] font-bold">
        {editing ? t("postEditHeading", { title: editing.title }) : t("postNewHeading")}
      </h2>
      {editing ? (
        <p className="mt-1">
          <Link
            href="/admin/sadrzaj"
            className="text-[13px] font-semibold text-sea underline decoration-line underline-offset-2"
          >
            {t("postNewInstead")}
          </Link>
        </p>
      ) : null}
      <PostEditor key={editing?.id ?? "new"} post={editing} />

      {posts.length > 0 ? (
        <>
          <h2 className="mt-10 text-[15px] font-bold">{t("postListHeading")}</h2>
          <ul className="mt-3 space-y-1.5">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/admin/sadrzaj?post=${post.id}`}
                  className="flex flex-wrap items-baseline gap-x-3 rounded-[10px] border-[1.5px] border-line px-3.5 py-2 text-[13.5px] transition-colors hover:border-sea"
                >
                  <span className="font-mono text-[11px] uppercase text-sea">
                    {post.locale}
                  </span>
                  <span className="font-semibold">{post.title}</span>
                  <span className="font-mono text-[12px] text-ink/45">/{post.slug}</span>
                  <span
                    className={
                      post.published_at
                        ? "ml-auto text-[12px] font-semibold text-sea"
                        : "ml-auto text-[12px] text-ink/50"
                    }
                  >
                    {post.published_at ? t("postLive") : t("postDraft")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 className="mt-12 text-[15px] font-bold">{t("galleryHeading")}</h2>
      <p className="mt-1 text-[13px] text-ink/60">{t("galleryHint")}</p>
      <GalleryManager items={gallery} events={events} />
    </div>
  );
}
