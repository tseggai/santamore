import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ShareToolkit } from "@/components/dashboard/ShareToolkit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShareToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: mine } = await supabase
    .from("fundraisers")
    .select("slug, title")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mine) redirect(`/${locale}/dashboard`);

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("shareTools")}</h1>
      <div className="mt-5">
        <ShareToolkit
          title={mine.title}
          pagePath={`/${locale}/f/${mine.slug}`}
          imagePath={`/${locale}/f/${mine.slug}/opengraph-image`}
          siteOrigin={(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}
        />
      </div>
    </div>
  );
}
