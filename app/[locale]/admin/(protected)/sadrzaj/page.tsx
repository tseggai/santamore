import { getTranslations } from "next-intl/server";

import { BeneficiariesManager, type BeneficiaryRow } from "@/components/admin/BeneficiariesManager";
import { PostsManager } from "@/components/admin/PostsManager";
import { SitePagesManager, type SitePageRow } from "@/components/admin/SitePagesManager";
import { aboutContent } from "@/content/site/about";
import { howContent } from "@/content/site/how";
import type { PageContent } from "@/lib/site-pages";
import type { Locale } from "@/i18n/routing";
import type { EditablePost } from "@/components/admin/PostEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ post?: string }>;
}) {
  const [{ locale }, { post: postId }] = await Promise.all([params, searchParams]);
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: postsData }, { data: beneficiariesData }, { data: sitePagesData }, { data: causesData }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, locale, slug, title, excerpt, body_md, cover_path, published_at")
        .order("published_at", { ascending: false, nullsFirst: true })
        .limit(100),
      supabase.from("beneficiaries").select("*").order("sort_order").order("name").limit(500),
      supabase.from("site_pages").select("page, locale, content, updated_at"),
      supabase.from("campaigns").select("id, title").order("starts_at", { ascending: false }).limit(300),
    ]);

  const posts = (postsData ?? []) as EditablePost[];
  const beneficiaries = (beneficiariesData ?? []) as BeneficiaryRow[];
  const causes = ((causesData ?? []) as { id: string; title: string }[]).map((c) => ({ id: c.id, title: c.title }));

  const sitePages = (sitePagesData ?? []) as SitePageRow[];
  const shipped = {
    about: aboutContent as unknown as Record<Locale, PageContent>,
    how: howContent as unknown as Record<Locale, PageContent>,
  };

  return (
    <div className="py-8">
      <h2 className="text-[16px] font-bold">{t("sitePagesHeading")}</h2>
      <p className="mt-1 text-[14px] text-black/60">{t("sitePagesHint")}</p>
      <div className="mt-4">
        <SitePagesManager rows={sitePages} shipped={shipped} locale={locale as Locale} />
      </div>

      <div className="mt-12">
        <PostsManager posts={posts} initialPostId={postId} title={t("contentTitle")} lead={t("contentLead")} />
      </div>

      <div className="mt-12">
        <BeneficiariesManager rows={beneficiaries} causes={causes} />
      </div>
    </div>
  );
}
