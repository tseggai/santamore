import { redirect } from "next/navigation";

// Offers live on challenge events now (owner decision 2026-09-13).
export default async function Moved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/dogadjaji`);
}
