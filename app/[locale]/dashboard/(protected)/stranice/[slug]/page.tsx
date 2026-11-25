import { redirect } from "next/navigation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A page has one editor: the slide-over on the fundraising hub. This
 * address is what the overview, the create form and old links point at, so
 * it hands over to the hub with that page open (owner decision 2026-11-25:
 * the same page must look the same from wherever it is opened). A "#gotovina"
 * on the link survives the redirect.
 */
export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ locale, slug }, { team }] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams({ stranica: slug });
  if (team && UUID.test(team)) query.set("team", team);
  redirect(`/${locale}/dashboard/stranice?${query.toString()}`);
}
