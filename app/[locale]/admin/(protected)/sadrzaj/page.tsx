import { getTranslations } from "next-intl/server";

import { GalleryManager, type GalleryAdminItem } from "@/components/admin/GalleryManager";
import { PostsManager } from "@/components/admin/PostsManager";
import type { EditablePost } from "@/components/admin/PostEditor";
import { createClient } from "@/lib/supabase/server";

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

  const [{ data: postsData }, { data: galleryData }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, locale, slug, title, excerpt, body_md, cover_path, published_at")
        .order("published_at", { ascending: false, nullsFirst: true })
        .limit(100),
      supabase
        .from("gallery_items")
        .select("id, storage_path, caption, credit, is_published, event_id, campaign_id")
        .is("event_id", null)
        .is("campaign_id", null)
        .order("sort_order", { ascending: false })
        .limit(120),
    ]);

  const posts = (postsData ?? []) as EditablePost[];
  const gallery = (galleryData ?? []) as GalleryAdminItem[];

  return (
    <div className="py-8">
      <PostsManager posts={posts} initialPostId={postId} title={t("contentTitle")} lead={t("contentLead")} />

      <h2 className="mt-12 text-[16px] font-bold">{t("galleryLooseHeading")}</h2>
      <p className="mt-1 text-[14px] text-black/60">{t("galleryLooseHint")}</p>
      <GalleryManager items={gallery} />
    </div>
  );
}
