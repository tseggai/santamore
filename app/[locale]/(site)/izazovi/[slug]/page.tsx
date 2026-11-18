import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";

import { cachedPublic } from "@/lib/public-data";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * A reward has no page of its own any more: it is shown, explained and
 * shared on its challenge's page. This address stays for the links already
 * out there (shared before, printed on a redeemed code, on the partners
 * page) and sends them to the challenge. A reward whose challenge is not
 * published is not public, so there is nowhere to send them.
 */
export default async function RewardRedirect({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  let eventSlug: string | null = null;
  try {
    eventSlug = await cachedPublic(["challenge-event", slug], async (supabase) => {
      const { data } = await supabase.from("v_public_perk_challenges").select("event_slug").eq("slug", slug).maybeSingle();
      return (data as { event_slug: string | null } | null)?.event_slug ?? null;
    });
  } catch {
    eventSlug = null;
  }
  if (!eventSlug) notFound();
  redirect(`/${locale}/dogadjaji/${encodeURIComponent(eventSlug)}`);
}
