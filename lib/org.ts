// Single source for the organisation's bank identity, used by the SEPA
// panel, the EPC QR and the transfer-instructions email. Values are public
// (an IBAN is printed on every invoice), so NEXT_PUBLIC_ vars are fine.
// They are real-world facts we must never fabricate: until they are set,
// pages render an explicit placeholder state and the QR is suppressed
// (docs/PLACEHOLDERS.md).

export interface OrgBankDetails {
  name: string;
  iban: string;
  bic: string;
}

export function getOrgBankDetails(): OrgBankDetails {
  return {
    name: process.env.NEXT_PUBLIC_ORG_NAME ?? "",
    iban: process.env.NEXT_PUBLIC_ORG_IBAN ?? "",
    bic: process.env.NEXT_PUBLIC_ORG_BIC ?? "",
  };
}

/**
 * A real IBAN: country code, two check digits, 11 to 30 characters, and
 * the ISO 7064 mod-97 check passes. A placeholder such as "coming soon"
 * fails it, so a note left in the env var can never open donations.
 */
export function isPlausibleIban(value: string): boolean {
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

/** BIC stays optional (EPC payload v002); name + a real IBAN are required. */
export function hasBankDetails(details: OrgBankDetails): boolean {
  return details.name.trim() !== "" && isPlausibleIban(details.iban);
}

/**
 * Pledge mode: no real bank account yet, so a gift is recorded as a pledge
 * and the transfer details follow by email once the account opens.
 */
export function isPledgeMode(): boolean {
  return !hasBankDetails(getOrgBankDetails());
}
