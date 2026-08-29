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

/** BIC stays optional (EPC payload v002); name + IBAN are required. */
export function hasBankDetails(details: OrgBankDetails): boolean {
  return details.name.trim() !== "" && details.iban.trim() !== "";
}
