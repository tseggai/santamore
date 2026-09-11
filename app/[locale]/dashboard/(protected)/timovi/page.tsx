import { redirect } from "next/navigation";

// Folded into My page (owner decision 2026-09-11); old links still land.
export default async function Moved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/stranice`);
}
