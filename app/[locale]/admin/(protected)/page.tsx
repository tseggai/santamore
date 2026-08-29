import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function AdminIndexPage() {
  const t = await getTranslations("admin");

  return (
    <div className="py-8">
      <Link
        href="/admin/donacije"
        className="inline-block rounded-xl border-[1.5px] border-line px-5 py-3 text-[14.5px] font-semibold transition-colors hover:border-sea hover:text-sea"
      >
        {t("donationsLink")}
      </Link>
    </div>
  );
}
