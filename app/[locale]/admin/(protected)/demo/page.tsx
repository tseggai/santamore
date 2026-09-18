import { redirect } from "next/navigation";

/** Demo data moved under Settings. */
export default async function Moved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/podesavanja/demo`);
}
