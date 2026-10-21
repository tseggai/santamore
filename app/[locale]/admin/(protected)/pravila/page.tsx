import { redirect } from "next/navigation";

// Rules became part of Documents (owner decision 2026-10-21); old links still land.
export default async function Moved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/dokumenti`);
}
