import { redirect } from "next/navigation";

/** Registrations moved under Events. */
export default async function Moved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/dogadjaji/prijave`);
}
