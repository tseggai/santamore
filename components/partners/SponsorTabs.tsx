"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The two views of the sponsors page, one at a time: the tiers ("Be a
 * sponsor") and who already sponsors us ("Our sponsors"). The hash picks
 * the view on load, so /partneri#sponzori opens on the sponsors, and the
 * landing page's "Be a sponsor" lands on the tiers.
 */
export function SponsorTabs({ labels, tiers, sponsors }: { labels: { sponsor: string; sponsors: string }; tiers: ReactNode; sponsors: ReactNode }) {
  const [view, setView] = useState<"tiers" | "sponsors">("tiers");
  useEffect(() => {
    const pick = () => setView(window.location.hash === "#sponzori" ? "sponsors" : "tiers");
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, []);
  const tab = (key: "tiers" | "sponsors", label: string, hash: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === key}
      onClick={() => { setView(key); window.history.replaceState(null, "", hash); }}
      className={`rounded-lg px-4 py-2 text-[15px] font-semibold transition-colors ${view === key ? "bg-sea text-paper" : "text-black/70 hover:bg-mist-2"}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div role="tablist" className="inline-flex gap-1 rounded-lg bg-mist p-1">
        {tab("tiers", labels.sponsor, "#nivoi")}
        {tab("sponsors", labels.sponsors, "#sponzori")}
      </div>
      <div role="tabpanel" className="mt-6">{view === "tiers" ? tiers : sponsors}</div>
    </div>
  );
}
