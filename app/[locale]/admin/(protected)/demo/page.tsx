import { getTranslations } from "next-intl/server";

import { DemoTool } from "@/components/admin/DemoTool";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Demo data for walkthroughs before launch: bulk teams, runners with
 * photos, stories and goals, and approved donations. The counts read the
 * registry with the service role AFTER the layout's staff gate — the
 * registry table has no client grants on purpose.
 */
export default async function AdminDemoPage() {
  const t = await getTranslations("admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isStaff = profile?.role === "admin" || profile?.role === "chapter_lead";

  const counts = { users: 0, teams: 0, fundraisers: 0, donations: 0 };
  if (isStaff) {
    try {
      const { data } = await createServiceClient().from("demo_records").select("kind");
      for (const row of data ?? []) {
        const key = `${row.kind}s` as keyof typeof counts;
        if (key in counts) counts[key] += 1;
      }
    } catch {
      // Service credentials missing in this environment — show zeros.
    }
  }

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("demoTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink/60">{t("demoHint")}</p>
      <DemoTool counts={counts} />
    </div>
  );
}
