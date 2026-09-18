import { redirect } from "next/navigation";

/** Content moved: pages and news under Settings, beneficiaries in their own section. */
export default async function Moved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/podesavanja`);
}
