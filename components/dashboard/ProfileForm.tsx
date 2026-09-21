"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { updateMyProfile } from "@/app/[locale]/dashboard/(protected)/actions";
import { routing, type Locale } from "@/i18n/routing";

const labelClass = "text-[13.5px] font-semibold";
const inputClass = "mt-1 w-full rounded-lg bg-paper px-3.5 py-2.5 text-[15px] outline-none ring-sea/40 focus:ring-2";

/** The signed-in person's own record: name, phone and the language we write to them in. */
export function ProfileForm({ fullName, phone, locale, email }: { fullName: string; phone: string; locale: Locale; email: string | null }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [lang, setLang] = useState<Locale>(locale);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "busy") return;
    setState("busy");
    const result = await updateMyProfile({ fullName: name, phone: tel, locale: lang }).catch(() => ({ ok: false }));
    setState(result.ok ? "saved" : "error");
    if (result.ok) router.refresh();
  };

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-lg bg-mist px-5 py-5">
      <div>
        <span className={labelClass}>{t("profileEmail")}</span>
        <p className="mt-1 text-[15px] text-black/70">{email ?? "—"}</p>
      </div>
      <div>
        <label htmlFor="pfName" className={labelClass}>{t("nameLabel")}</label>
        <input id="pfName" type="text" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="pfPhone" className={labelClass}>{t("profilePhone")}</label>
        <input id="pfPhone" type="tel" maxLength={30} value={tel} onChange={(e) => setTel(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="pfLocale" className={labelClass}>{t("profileLocale")}</label>
        <select id="pfLocale" value={lang} onChange={(e) => setLang(e.target.value as Locale)} className={inputClass}>
          {routing.locales.map((value) => (
            <option key={value} value={value}>{t(`profileLocaleName.${value}`)}</option>
          ))}
        </select>
      </div>
      {state === "error" ? <p role="alert" className="text-[14px] font-semibold text-red-dark">{t("actionError")}</p> : null}
      {state === "saved" ? <p className="text-[14px] font-semibold text-sea">{t("saved")}</p> : null}
      <button type="submit" disabled={state === "busy"} className="rounded-lg bg-ink px-5 py-2.5 text-[14.5px] font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-60">
        {t("profileSave")}
      </button>
    </form>
  );
}
