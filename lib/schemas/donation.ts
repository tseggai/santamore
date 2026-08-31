import { z } from "zod";

import { MAX_CENTS } from "@/lib/money";

export const MIN_DONATION_CENTS = 100; // €1
export const MAX_MESSAGE_LENGTH = 500;

// Shared client/server: the client validates for fast feedback, the server
// action re-validates the same schema — client input is never trusted.
export const donationFormSchema = z.object({
  amountCents: z.number().int().min(MIN_DONATION_CENTS).max(MAX_CENTS),
  monthly: z.boolean(),
  coverFee: z.boolean(),
  anonymous: z.boolean(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(100),
  message: z.string().trim().max(MAX_MESSAGE_LENGTH),
});

export const donationPledgeSchema = donationFormSchema
  .extend({
    // Exactly one target: a campaign or a fundraiser page (Task 5).
    campaignSlug: z.string().trim().min(1).max(100).optional(),
    fundraiserSlug: z.string().trim().min(1).max(100).optional(),
    locale: z.enum(["me", "en", "ru"]),
    rail: z.literal("sepa"), // the card rail arrives with Task 4
  })
  .refine(
    (pledge) =>
      (pledge.campaignSlug === undefined) !== (pledge.fundraiserSlug === undefined),
    { message: "exactly one donation target" },
  );

export type DonationFormValues = z.infer<typeof donationFormSchema>;
export type DonationPledge = z.infer<typeof donationPledgeSchema>;
