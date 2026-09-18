import { getTranslations, setRequestLocale } from "next-intl/server";

import type { EditablePost } from "@/components/admin/PostEditor";
import { PostsManager } from "@/components/admin/PostsManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** News posts in every site language. */
export default async function SettingsNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  const [{ locale }, { post: postId }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, locale, slug, title, excerpt, body_md, cover_path, published_at")
    .order("published_at", { ascending: false, nullsFirst: true })
    .limit(100);
  return (
    <div className="pb-8">
      <PostsManager posts={(data ?? []) as EditablePost[]} initialPostId={postId} title={t("contentTitle")} lead={t("contentLead")} />
    </div>
  );
}
