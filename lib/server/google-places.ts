import "server-only";

import { placeToCandidate, type GooglePlace, type LiveCandidate, type PlannedSearch } from "@/lib/prospect-live";

// Places API (New) Text Search; shapes from docs/vendor/google-places.md.
// The field mask asks for a phone, a website and a rating, which bills each
// request at the Enterprise rate: that is the point of the search.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "nextPageToken",
].join(",");

export function googlePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export class GooglePlacesError extends Error {}

/** One planned search, up to `depth` results (20 per page, 60 at most). Returns the candidates and how many requests it took. */
export async function searchPlaces(search: PlannedSearch, depth: number): Promise<{ candidates: LiveCandidate[]; requests: number }> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new GooglePlacesError("unconfigured");
  const candidates: LiveCandidate[] = [];
  let pageToken: string | undefined;
  let requests = 0;
  while (candidates.length < depth && requests < 3) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
      // Every parameter but the page token must repeat on a next page.
      body: JSON.stringify({ textQuery: search.query, pageSize: 20, languageCode: "en", regionCode: "ME", ...(pageToken ? { pageToken } : {}) }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    requests += 1;
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[prospects] places search failed:", response.status, detail.slice(0, 300));
      throw new GooglePlacesError(response.status === 403 || response.status === 400 ? "refused" : "failed");
    }
    const data = (await response.json()) as { places?: GooglePlace[]; nextPageToken?: string };
    for (const place of data.places ?? []) {
      const candidate = placeToCandidate(place, search);
      if (candidate) candidates.push(candidate);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return { candidates: candidates.slice(0, depth), requests };
}
