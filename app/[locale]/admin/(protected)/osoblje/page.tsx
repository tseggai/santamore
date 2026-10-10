import { setRequestLocale } from "next-intl/server";

import { TeamManager, type AccountOption, type TeamRow } from "@/components/admin/TeamManager";
import { isAdmin } from "@/lib/server/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Staff: the people on the team, each with a role, a title and — through a linked account — an access level. */
export default async function TeamPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ uredi?: string }> }) {
  const [{ locale }, { uredi }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const supabase = await createClient();
  const [{ data: rows }, { data: accounts }, canManage] = await Promise.all([
    supabase.from("team_members").select("*").order("sort_order").order("full_name").limit(1000),
    supabase.from("v_staff_members").select("id, full_name, email, role").order("full_name").limit(2000),
    isAdmin(),
  ]);
  return (
    <div className="pb-8">
      <div>
        <TeamManager rows={(rows ?? []) as TeamRow[]} accounts={(accounts ?? []) as AccountOption[]} initialOpenId={uredi ?? ""} canManage={canManage} />
      </div>
    </div>
  );
}
