import { redirect } from "next/navigation";

/** People moved: staff and accounts live under Staff, fundraisers, donors, participants and teams under Supporters. */
export default async function PeopleRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/osoblje`);
}
