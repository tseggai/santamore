import { describe, expect, it } from "vitest";

import { cleanUrl, comparableUrl, extractContacts, isPublicHost, keepRetrieved, lastJson, placeToCandidate, planSearches, sourcedCheck, sourcedFinds } from "@/lib/prospect-live";
import { catalogueKey } from "@/lib/prospects";

describe("google search", () => {
  it("plans one search per term and town, tagged with sector and area", () => {
    const plan = planSearches(["health", "hotel"], ["Tivat", "Budva"], "");
    expect(plan).toHaveLength(6);
    expect(plan[0]).toEqual({ query: "dental clinic Tivat Montenegro", sector: "health", town: "Tivat", area: "tivat" });
    expect(plan[5]).toEqual({ query: "hotel Budva Montenegro", sector: "hotel", town: "Budva", area: "coast" });
    expect(planSearches([], ["Kotor"], "wine shop")).toEqual([{ query: "wine shop Kotor Montenegro", sector: "local_shop", town: "Kotor", area: "boka" }]);
  });

  it("turns a place into a candidate and leaves out the closed and the nameless", () => {
    const search = { query: "gym Tivat Montenegro", sector: "fitness_wellness", town: "Tivat", area: "tivat" } as const;
    const candidate = placeToCandidate({ id: "ChIJ1", displayName: { text: "Gym One" }, formattedAddress: "Obala 1, Tivat", internationalPhoneNumber: "+382 67 111 222", websiteUri: "https://gym.me/?utm_source=google#top", googleMapsUri: "https://maps.google.com/?cid=1", rating: 4.8, userRatingCount: 120 }, search);
    expect(candidate).toMatchObject({ ref: "ChIJ1", source: "google", name: "Gym One", town: "Tivat", area: "tivat", sector: "fitness_wellness", phone: "+382 67 111 222", website: "https://gym.me/", rating: 4.8, rating_count: 120 });
    expect(candidate?.sources).toEqual(["https://maps.google.com/?cid=1", "https://gym.me/"]);
    expect(placeToCandidate({ id: "x", displayName: { text: "Old" }, businessStatus: "CLOSED_PERMANENTLY" }, search)).toBeNull();
    expect(placeToCandidate({ id: "x" }, search)).toBeNull();
  });
});

describe("a website's contacts", () => {
  it("reads published emails, the site's own first, and the Instagram account", () => {
    const html = `<a href="mailto:Info@Gym.me">write</a> booking [at] gym.me <img src="logo@2x.png"> partner@gmail.com <a href="https://www.instagram.com/gym.tivat/">ig</a> <a href="https://instagram.com/p/abc">post</a>`;
    expect(extractContacts(html, "https://www.gym.me/kontakt")).toEqual({ emails: ["info@gym.me", "booking@gym.me", "partner@gmail.com"], instagram: "gym.tivat" });
    expect(extractContacts("<p>no contact</p>", "https://x.me")).toEqual({ emails: [], instagram: null });
  });

  it("fetches public sites only", () => {
    expect(isPublicHost("www.gym.me")).toBe(true);
    for (const host of ["localhost", "127.0.0.1", "10.0.0.5", "[::1]", "intranet", "db.internal", "printer.local"]) expect(isPublicHost(host), host).toBe(false);
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
    expect(cleanUrl("https://a.me/x?gclid=1&id=2")).toBe("https://a.me/x?id=2");
  });
});

describe("live research, held to its sources", () => {
  const retrieved = new Set(["https://bank.me/csr", "https://news.me/2026/half-marathon"].map((url) => comparableUrl(url)!));

  it("compares pages without www, fragment or trailing slash", () => {
    expect(comparableUrl("https://WWW.Bank.me/csr/#top")).toBe("https://bank.me/csr");
    expect(keepRetrieved(["https://www.bank.me/csr/", "https://made-up.me/page", null], retrieved)).toEqual(["https://www.bank.me/csr/"]);
  });

  it("reads the last JSON in an answer", () => {
    expect(lastJson('I searched.\n```json\n{"status":"operating"}\n```')).toEqual({ status: "operating" });
    expect(lastJson('Result: {"a":1}')).toEqual({ a: 1 });
    expect(lastJson("nothing here")).toBeNull();
  });

  it("keeps a person only with a page the search returned, and nothing without a source", () => {
    const answer = { status: "operating", summary: "Sponsors the half marathon.", sponsorship_record: "2026: half marathon", contact_name: "Ana Anić", contact_role: "Head of Marketing", contact_email: "ana@bank.me", contact_source: "https://bank.me/csr", sources: ["https://news.me/2026/half-marathon", "https://invented.me/x"] };
    const kept = sourcedCheck(answer, retrieved);
    expect(kept?.contact_name).toBe("Ana Anić");
    expect(kept?.sources).toEqual(["https://bank.me/csr", "https://news.me/2026/half-marathon"]);
    const noPage = sourcedCheck({ ...answer, contact_source: "https://invented.me/team" }, retrieved);
    expect(noPage?.contact_name).toBeNull();
    expect(noPage?.contact_email).toBeNull();
    expect(noPage?.sources).toEqual(["https://news.me/2026/half-marathon"]);
    expect(sourcedCheck({ ...answer, contact_source: null, sources: ["https://invented.me/x"] }, retrieved)).toBeNull();
  });

  it("turns finds into candidates and drops the unsourced and the repeated", () => {
    const finds = sourcedFinds(
      { organisations: [
        { name: "Banka Primjer", sector: "bank", town: "Podgorica", why: "Gold sponsor of the 2026 half marathon.", sources: ["https://news.me/2026/half-marathon"], contact_name: "Ana Anić", contact_role: "PR", contact_source: "https://invented.me/x" },
        { name: "Banka  Primjer", sector: "bank", sources: ["https://bank.me/csr"] },
        { name: "Made Up d.o.o.", sector: "nonsense", sources: ["https://invented.me/y"] },
      ] },
      retrieved,
      "national",
      catalogueKey,
    );
    expect(finds).toHaveLength(1);
    expect(finds[0]).toMatchObject({ ref: "banka-primjer", source: "research", name: "Banka Primjer", area: "national", contact_name: null, why: "Gold sponsor of the 2026 half marathon." });
  });
});
