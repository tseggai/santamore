import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <h1 className="type-display text-4xl">{t("title")}</h1>
      <p className="mt-4 text-[15px] text-ink/70">{t("body")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl border-[1.5px] border-line px-5 py-3 text-sm font-semibold hover:border-sea hover:text-sea"
      >
        {t("back")}
      </Link>
    </div>
  );
}
