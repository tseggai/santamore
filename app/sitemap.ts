import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

import { siteOrigin } from "@/lib/site";
import { routing } from "@/i18n/routing";

// Public, indexable routes; private areas (admin, dashboard) and one-off
// utility pages stay out. Legal pages are indexed — the acquirer and donors
// both look for them.
const STATIC_PATHS = [
  "",
  "/podrzi",
  "/prikupljaci",
  "/dogadjaji",
  "/galerija",
  "/transparentnost",
  "/o-nama",
  "/kako-radimo",
  "/partneri",
  "/vijesti",
  "/cesta-pitanja",
  "/kontakt",
  "/volontiraj",
  "/prijava-za-pomoc",
  "/pravila-privatnosti",
  "/kolacici",
  "/uslovi-koriscenja",
  "/pravila-donacija",
  "/uslovi-ucesca",
  "/zastita-djece",
  "/kodeks",
  "/informacije-o-organizaciji",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    for (const locale of routing.locales) {
      entries.push({ url: `${origin}/${locale}${path}` });
    }
  }

  // Dynamic public content via the anon key and the v_public_* views only.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      const [fundraisers, teams, events, posts] = await Promise.all([
        supabase.from("v_fundraiser_totals").select("slug").limit(2000),
        supabase.from("v_team_totals").select("slug").limit(500),
        supabase.from("v_public_events").select("slug").limit(200),
        supabase.from("v_public_posts").select("slug").limit(500),
      ]);
      const dynamicPaths = [
        ...(fundraisers.data ?? []).map((row) => `/f/${row.slug}`),
        ...(teams.data ?? []).map((row) => `/t/${row.slug}`),
        ...(events.data ?? []).map((row) => `/dogadjaji/${row.slug}`),
        ...new Set((posts.data ?? []).map((row) => `/vijesti/${row.slug}`)),
      ];
      for (const path of dynamicPaths) {
        for (const locale of routing.locales) {
          entries.push({ url: `${origin}/${locale}${path}` });
        }
      }
    } catch {
      // Sitemap stays static-only if the database is unreachable.
    }
  }

  return entries;
}
