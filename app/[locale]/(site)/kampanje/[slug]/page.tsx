import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import type { PublicBeneficiary } from "@/components/beneficiaries/BeneficiaryStories";
import {
  CampaignPageView,
  type CampaignEventItem,
  type CampaignView,
} from "@/components/campaigns/CampaignPageView";
import { toGalleryImages, type PublicGalleryRow } from "@/lib/gallery";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

async function fetchCampaign(slug: string): Promise<CampaignView | null> {
  try {
    const supabase = await createClient();
    const [{ data: campaign }, { data: events }, { data: galleryRows }, { data: beneficiaryRows }] = await Promise.all([
      supabase
        .from("v_public_campaigns")
        .select("*")
        .eq("slug", slug)
        .maybeSingle(),
      supabase
        .from("v_public_events")
        .select("slug, name, starts_at, kind")
        .eq("campaign_slug", slug)
        .order("starts_at", { ascending: true }),
      supabase
        .from("v_public_gallery")
        .select("id, storage_path, caption, credit, campaign_slug, campaign_title")
        .eq("campaign_slug", slug)
        .order("sort_order", { ascending: true })
        .limit(120),
      supabase
        .from("v_public_beneficiaries")
        .select("id, slug, name, website, photo_path, story, campaign_slug, campaign_title")
        .eq("campaign_slug", slug)
        .order("sort_order"),
    ]);
    if (!campaign) return null;
    return {
      ...(campaign as Omit<CampaignView, "events">),
      events: (events ?? []) as CampaignEventItem[],
      gallery: toGalleryImages((galleryRows ?? []) as PublicGalleryRow[]),
      beneficiaries: (beneficiaryRows ?? []) as PublicBeneficiary[],
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const campaign = await fetchCampaign(slug);
  return { title: campaign ? `${campaign.title} — Santamore` : "Santamore" };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const campaign = await fetchCampaign(slug);
  if (!campaign) notFound();

  return <CampaignPageView campaign={campaign} />;
}
