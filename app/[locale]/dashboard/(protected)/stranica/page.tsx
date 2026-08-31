import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageEditor } from "@/components/dashboard/PageEditor";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function EditPagePage({
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
    .select("id, slug, title, story, goal_cents, photo_path, status, team_id, event_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!mine) redirect(`/${locale}/dashboard`);

  const [{ data: teams }, { data: totals }] = await Promise.all([
    supabase
      .from("v_team_totals")
      .select("id, name")
      .eq("event_id", mine.event_id)
      .order("name"),
    supabase
      .from("v_fundraiser_totals")
      .select("raised_cents, donor_count")
      .eq("slug", mine.slug)
      .maybeSingle(),
  ]);

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("editorTitle")}</h1>
      <div className="mt-5">
        <PageEditor
          locale={locale as Locale}
          fundraiser={{
            slug: mine.slug,
            title: mine.title,
            story: mine.story ?? "",
            goalCents: mine.goal_cents,
            photoPath: mine.photo_path,
            status: mine.status,
            teamId: mine.team_id,
          }}
          teams={(teams ?? []) as { id: string; name: string }[]}
          raisedCents={totals?.raised_cents ?? 0}
          donorCount={totals?.donor_count ?? 0}
        />
      </div>
    </div>
  );
}
