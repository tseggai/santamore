import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "recovery", "invite", "email_change"];

/** The OTP type named in a sign-in link, or the magic-link default. */
export function otpType(value: string | null | undefined): EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : "email";
}
