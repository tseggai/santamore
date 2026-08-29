import { assertCents, MAX_CENTS, type Cents } from "@/lib/money";

// EPC069-12 SEPA Credit Transfer QR payload ("EPC QR"). Verified against
// the spec text saved in docs/vendor/epc-qr.md (EPC069-12 v3.1, §2).
//
// DEVIATION FROM THE BRIEF, flagged per "tell me when this brief is
// wrong": the brief places our SM-XXXX-XXXX reference in the STRUCTURED
// remittance element, but per §2.2 that element is a Creditor Reference
// (ISO 11649 "RF.." may be used) and banking apps commonly validate the RF
// format there. The reference therefore goes in the UNSTRUCTURED
// remittance element (max 140 chars); only one of the two may be
// populated. Still pending: scan test with ≥2 real EU banking apps.
//
// Version 002 is used, where BIC is conditional: §2.2 keeps it MANDATORY
// for SCT participants from non-EEA countries — which includes Montenegro
// — so the builder requires a BIC whenever the IBAN is non-EEA. Character
// set 1 = UTF-8. Error-correction level M (set where the QR is rendered,
// not in the payload). Max payload: 331 bytes, no trailing separator.

export const EPC_MAX_PAYLOAD_BYTES = 331;

const IBAN_PATTERN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
const BIC_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/;

// EU member states plus Iceland, Liechtenstein and Norway. SEPA countries
// outside this set (Montenegro among them) need the BIC in the payload.
const EEA_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO",
]);

export interface EpcQrInput {
  /** Account holder's registered name, max 70 chars. */
  beneficiaryName: string;
  /** IBAN; spaces allowed, normalised internally. */
  iban: string;
  /** Required when the IBAN's country is outside the EEA (Montenegro is). */
  bic?: string;
  /** Optional: banks pre-fill the amount when present. 1 cent .. €999,999,999.99. */
  amountCents?: Cents;
  /** Our SM-MMYY-NNNN payment reference → unstructured remittance line. */
  reference: string;
}

/** Normalise an IBAN for the payload: strip spaces, uppercase. */
export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/** Group an IBAN in fours for display, per the prototype's SEPA panel. */
export function formatIbanForDisplay(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();
}

function formatEpcAmount(amountCents: Cents): string {
  assertCents(amountCents);
  if (amountCents < 1 || amountCents > MAX_CENTS) {
    throw new RangeError("EPC amount out of range");
  }
  const euros = Math.floor(amountCents / 100);
  const cents = String(amountCents % 100).padStart(2, "0");
  return `EUR${euros}.${cents}`;
}

/**
 * Build the newline-delimited EPC069-12 payload. Throws on any input that
 * would produce a payload banks reject — callers show the manual-transfer
 * fallback instead of a broken QR.
 */
export function buildEpcQrPayload(input: EpcQrInput): string {
  const name = input.beneficiaryName.trim();
  if (name.length === 0 || name.length > 70) {
    throw new RangeError("beneficiary name must be 1-70 characters");
  }

  const iban = normalizeIban(input.iban);
  if (!IBAN_PATTERN.test(iban)) {
    throw new RangeError("not a plausible IBAN");
  }

  const bic = input.bic ? input.bic.replace(/\s+/g, "").toUpperCase() : "";
  if (bic && !BIC_PATTERN.test(bic)) {
    throw new RangeError("not a plausible BIC");
  }
  if (!bic && !EEA_COUNTRIES.has(iban.slice(0, 2))) {
    throw new RangeError(
      "BIC is required for a non-EEA beneficiary PSP (EPC069-12 §2.2)",
    );
  }

  const reference = input.reference.trim();
  if (reference.length === 0 || reference.length > 140) {
    throw new RangeError("remittance reference must be 1-140 characters");
  }

  const lines = [
    "BCD", // service tag
    "002", // version: BIC optional inside SEPA
    "1", // character set: UTF-8
    "SCT", // SEPA Credit Transfer
    bic,
    name,
    iban,
    input.amountCents === undefined ? "" : formatEpcAmount(input.amountCents),
    "", // purpose code — unused
    "", // structured remittance — must be ISO 11649; ours is not, so empty
    reference, // unstructured remittance — the SEPA matching key
    "", // beneficiary-to-originator information — unused
  ];

  // Trailing empty elements may be omitted per the spec.
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const payload = lines.join("\n");
  if (new TextEncoder().encode(payload).length > EPC_MAX_PAYLOAD_BYTES) {
    throw new RangeError("EPC payload exceeds 331 bytes");
  }
  return payload;
}
