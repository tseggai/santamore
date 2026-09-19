import { getTranslations, setRequestLocale } from "next-intl/server";

import { TeamManager, type AccountOption, type TeamRow } from "@/components/admin/TeamManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The team: officers, staff, board, committee and volunteers, account or not. */
export default async function TeamPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ uredi?: string }> }) {
  const [{ locale }, { uredi }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const [{ data: rows }, { data: accounts }] = await Promise.all([
    supabase.from("team_members").select("*").order("sort_order").order("full_name").limit(1000),
    supabase.from("v_staff_members").select("id, full_name, email, role").order("full_name").limit(2000),
  ]);
  return (
    <div className="pb-8">
      <p className="text-[14px] leading-relaxed text-black/60">{t("teamHint")}</p>
      <div className="mt-4">
        <TeamManager rows={(rows ?? []) as TeamRow[]} accounts={(accounts ?? []) as AccountOption[]} initialOpenId={uredi ?? ""} />
      </div>
    </div>
  );
}
