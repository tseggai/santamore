import { getTranslations } from "next-intl/server";

import {
  PerkChallengesManager,
  type PerkChallengeAdminRow,
} from "@/components/admin/PerkChallengesManager";
import { localToday } from "@/lib/strava/sync";
import { createClient } from "@/lib/supabase/server";
import { stravaWebhookStatus } from "./actions";

export const dynamic = "force-dynamic";

interface ChallengeRow {
  id: string;
  slug: string;
  partner_name: string;
  title: string;
  description: string | null;
  reward_label: string;
  sport_types: string[];
  min_distance_m: number;
  max_moving_time_s: number | null;
  min_elevation_m: number;
  max_pace_s_per_km: number | null;
  required_days: number;
  window_days: number | null;
  partner_url: string | null;
  allow_manual: boolean;
  per_user_daily_cap: number;
  daily_cap: number | null;
  valid_days: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  redeem_pin_hash: string | null;
}

/** Partner perks: define the rule and the reward, set the partner's PIN, watch redemptions. */
export default async function AdminChallengesPage() {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  const [{ data: challenges }, { data: awards }, webhook] = await Promise.all([
    supabase.from("perk_challenges").select("*").order("created_at", { ascending: false }),
    supabase.from("perk_awards").select("challenge_id, status, awarded_on").limit(20_000),
    stravaWebhookStatus(),
  ]);

  const today = localToday();
  const stats = new Map<string, { issued: number; redeemed: number; today: number }>();
  for (const award of awards ?? []) {
    const entry = stats.get(award.challenge_id) ?? { issued: 0, redeemed: 0, today: 0 };
    if (award.status !== "revoked") entry.issued += 1;
    if (award.status === "redeemed") entry.redeemed += 1;
    if (award.awarded_on === today && award.status !== "revoked") entry.today += 1;
    stats.set(award.challenge_id, entry);
  }

  const rows = ((challenges ?? []) as ChallengeRow[]).map(
    ({ redeem_pin_hash, ...challenge }): PerkChallengeAdminRow => ({
      ...challenge,
      has_pin: redeem_pin_hash !== null,
      issued: stats.get(challenge.id)?.issued ?? 0,
      redeemed: stats.get(challenge.id)?.redeemed ?? 0,
      issued_today: stats.get(challenge.id)?.today ?? 0,
    }),
  );

  return (
    <div className="py-8">
      <h1 className="type-display text-2xl">{t("perksTitle")}</h1>
      <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink/60">{t("perksHint")}</p>
      <PerkChallengesManager challenges={rows} webhook={webhook} />
    </div>
  );
}
