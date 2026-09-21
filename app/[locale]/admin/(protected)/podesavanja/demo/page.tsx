import { getTranslations } from "next-intl/server";

import { DemoTool } from "@/components/admin/DemoTool";
import { TestModeCard } from "@/components/admin/TestModeCard";
import { createServiceClient } from "@/lib/supabase/admin";
import { isStaffRole } from "@/lib/roles";
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
  const isStaff = isStaffRole(profile?.role);
  const { data: testMode } = await supabase.rpc("test_mode");

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
    <div className="pb-8">
      <TestModeCard on={Boolean(testMode)} canManage={profile?.role === "admin"} />
      <h2 className="mt-8 text-[16px] font-bold">{t("demoTitle")}</h2>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-black/60">{t("demoHint")}</p>
      {profile?.role === "admin" ? <DemoTool counts={counts} /> : <p className="mt-3 text-[14px] text-black/60">{t("demoAdminOnly")}</p>}
    </div>
  );
}
