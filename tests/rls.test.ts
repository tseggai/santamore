/**
 * RLS tests (brief §6, rule 4): prove an ANONYMOUS client cannot reach
 * donor_email, beneficiary_private_note, or any provider_* field, and that
 * public data flows only through the v_public_* views.
 *
 * Runs against the live Supabase project using the anon key from .env.local
 * (or the environment). Auto-skips when the env vars are absent so `npm test`
 * stays green in CI without secrets.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
  } catch {
    // no .env.local — rely on the process environment
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasEnv = Boolean(url && anonKey);

const SENSITIVE_COLUMNS = [
  "donor_email",
  "beneficiary_private_note",
  "provider_order_number",
  "provider_transaction_id",
  "pan_token",
];

function expectDenied(error: { code?: string; message: string } | null): void {
  expect(error).not.toBeNull();
  // 42501 = permission denied (grants revoked). Anything that is not a
  // permission/authorization error means the table leaked.
  expect(
    error!.code === "42501" || /permission denied/i.test(error!.message),
    `expected permission denial, got: ${error!.code} ${error!.message}`,
  ).toBe(true);
}

describe.skipIf(!hasEnv)("RLS: anonymous client", () => {
  const anon = () => createClient(url!, anonKey!);

  const lockedTables = [
    "donations",
    "profiles",
    "subscriptions",
    "disbursements",
    "beneficiary_applications",
    "webhook_events",
    "ledger_adjustments",
    "registrations",
    "fundraisers",
  ];

  for (const table of lockedTables) {
    it(`cannot SELECT from ${table}`, async () => {
      const { error } = await anon().from(table).select("*").limit(1);
      expectDenied(error);
    });
  }

  it("cannot read donor_email from donations", async () => {
    const { error } = await anon().from("donations").select("donor_email");
    expectDenied(error);
  });

  it("cannot read provider fields or pan_token from donations", async () => {
    const { error } = await anon()
      .from("donations")
      .select("provider_order_number,provider_transaction_id,pan_token");
    expectDenied(error);
  });

  it("cannot read beneficiary_private_note from disbursements", async () => {
    const { error } = await anon()
      .from("disbursements")
      .select("beneficiary_private_note");
    expectDenied(error);
  });

  it("cannot INSERT a donation directly", async () => {
    const { error } = await anon().from("donations").insert({
      amount_cents: 100,
      rail: "other",
      campaign_id: "20000000-0000-4000-8000-000000000001",
    });
    expectDenied(error);
  });

  it("v_public_ledger_in returns rows with only public columns", async () => {
    const { data, error } = await anon().from("v_public_ledger_in").select("*");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    const keys = Object.keys(data![0]);
    for (const col of SENSITIVE_COLUMNS) {
      expect(keys, `view must not expose ${col}`).not.toContain(col);
    }
    // The sample donation shows its NET amount (25.00 €), not the charged total.
    const sample = data!.find(
      (r: Record<string, unknown>) => r.display_name === "Test Donor",
    );
    expect(sample?.amount_cents).toBe(2500);
  });

  it("v_public_ledger_out returns rows without the private note", async () => {
    const { data, error } = await anon().from("v_public_ledger_out").select("*");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(data![0])).not.toContain("beneficiary_private_note");
  });

  it("probing v_public_ledger_in for donor_email fails (column absent)", async () => {
    const { error } = await anon()
      .from("v_public_ledger_in")
      .select("donor_email");
    expect(error).not.toBeNull();
  });

  it("v_public_ledger_adjustments is readable and shows no private references", async () => {
    const { data, error } = await anon()
      .from("v_public_ledger_adjustments")
      .select("*");
    expect(error).toBeNull();
    if (data!.length > 0) {
      const keys = Object.keys(data![0]);
      expect(keys).not.toContain("beneficiary_private_note");
      expect(keys).not.toContain("created_by");
    }
  });

  it("v_chapter_totals and v_leaderboard are readable", async () => {
    const totals = await anon().from("v_chapter_totals").select("*");
    expect(totals.error).toBeNull();
    expect(totals.data!.length).toBeGreaterThanOrEqual(1);
    const board = await anon().from("v_leaderboard").select("*");
    expect(board.error).toBeNull();
  });
});

describe.skipIf(hasEnv)("RLS: environment", () => {
  it("skipped — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to run the RLS suite", () => {
    expect(hasEnv).toBe(false);
  });
});
