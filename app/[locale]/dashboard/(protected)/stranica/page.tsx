import { redirect } from "next/navigation";

/** Old editor URL — pages now live under /dashboard/stranice. */
export default async function LegacyEditorRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const [{ locale }, { team }] = await Promise.all([params, searchParams]);
  redirect(`/${locale}/dashboard/stranice${team ? `?team=${encodeURIComponent(team)}` : ""}`);
}
