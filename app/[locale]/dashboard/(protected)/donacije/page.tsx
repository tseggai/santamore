import { redirect } from "next/navigation";

/** My giving now lives with Events & causes. */
export default async function GivingRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/dogadjaji#moje-davanje`);
}
