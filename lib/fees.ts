import { assertCents, type Cents } from "@/lib/money";

// Card-processing fee model from the prototype: 2.1% + €0.20, rounded
// half-up to the cent, added ON TOP of the gift (the donor pays it; the
// full gift reaches the cause). Kept in integer arithmetic — never floats.
//
// Note: the prototype's static copy says "€25 → +€0.75", but its own
// formula (and this one) yields €0.73. The formula wins; see the Task 3
// plan notes.
export const FEE_RATE_BASIS_POINTS = 210;
export const FEE_FIXED_CENTS: Cents = 20;

/** Fee in cents for covering the processing cost of a gift of `amountCents`. */
export function calculateFeeCents(amountCents: Cents): Cents {
  assertCents(amountCents);
  if (amountCents <= 0) {
    throw new RangeError("fee is only defined for a positive amount");
  }
  const variable = Math.floor((amountCents * FEE_RATE_BASIS_POINTS + 5000) / 10000);
  return variable + FEE_FIXED_CENTS;
}

/** Total the donor pays when covering the fee: gift + fee. */
export function grossWithFeeCents(amountCents: Cents): Cents {
  return amountCents + calculateFeeCents(amountCents);
}
