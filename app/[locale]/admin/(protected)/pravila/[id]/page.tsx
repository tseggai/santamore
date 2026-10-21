import { redirect } from "next/navigation";

// Rules became part of Documents (owner decision 2026-10-21); old links to a document still land.
export default async function Moved({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/admin/dokumenti/${encodeURIComponent(id)}`);
}
