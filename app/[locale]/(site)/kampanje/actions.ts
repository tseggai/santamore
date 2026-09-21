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
    // The figure is the cause's own (one sum over the ledger, migration 0062);
    // the list is the latest rows, corrections included as signed lines.
    const [{ data }, { data: cause }] = await Promise.all([
      supabase
        .from("v_public_ledger_in")
        .select("id, entry_date, amount_cents, display_name, fundraiser_title, rail")
        .eq("cause_slug", parsed.data)
        .order("entry_date", { ascending: false })
        .limit(300),
      supabase.from("v_public_campaigns").select("raised_cents, donor_count").eq("slug", parsed.data).maybeSingle(),
    ]);
    const rows = (data ?? []) as CauseLedgerRow[];
    return {
      rows,
      totalCents: cause?.raised_cents ?? 0,
      donorCount: cause?.donor_count ?? 0,
    };
  } catch {
    return { rows: [], totalCents: 0, donorCount: 0 };
  }
}
