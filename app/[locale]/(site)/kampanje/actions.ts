"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export interface CauseLedgerRow {
  id: string;
  entry_date: string;
  amount_cents: number;
  display_name: string | null;
  fundraiser_title: string | null;
  rail: string;
}

export interface CauseLedger {
  rows: CauseLedgerRow[];
  totalCents: number;
  donorCount: number;
}

/** Money in for one cause: direct gifts plus every euro raised on its events' pages. */
export async function fetchCauseLedger(slug: string): Promise<CauseLedger> {
  const parsed = z.string().trim().min(1).max(100).safeParse(slug);
  if (!parsed.success) return { rows: [], totalCents: 0, donorCount: 0 };
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("v_public_ledger_in")
      .select("id, entry_date, amount_cents, display_name, fundraiser_title, rail")
      .eq("cause_slug", parsed.data)
      .order("entry_date", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as CauseLedgerRow[];
    return {
      rows,
      totalCents: rows.reduce((sum, row) => sum + row.amount_cents, 0),
      donorCount: rows.length,
    };
  } catch {
    return { rows: [], totalCents: 0, donorCount: 0 };
  }
}
