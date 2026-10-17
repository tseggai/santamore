"use server";

import { redirect } from "next/navigation";

import { otpType } from "@/lib/auth-otp";
import { safeNextPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

/**
 * The second half of the email link: the page shows a button, and only this
 * action, on the press, spends the token. A mail scanner or a link preview
 * only ever GETs the page, so the token survives it. On success the session
 * cookies are set here and the person lands where the link was meant to go.
 */
export async function confirmSignIn(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const type = otpType(String(formData.get("type") ?? ""));
  const locale = String(formData.get("locale") ?? routing.defaultLocale);
  const next = safeNextPath(String(formData.get("next") ?? ""), `/${locale}/dashboard`);
  const back = `/${locale}/potvrda-prijave?error=1&next=${encodeURIComponent(next)}`;
  if (!tokenHash) redirect(back);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    console.error("[auth] link confirmation failed:", error.message);
    redirect(back);
  }
  redirect(next);
}
