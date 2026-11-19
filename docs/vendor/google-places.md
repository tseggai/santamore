# Google Places API (New): Text Search

Saved from <https://developers.google.com/maps/documentation/places/web-service/text-search>
on 2026-11-19. This is what `lib/server/google-places.ts` is written against. Check
the page again before changing the call.

## Request

`POST https://places.googleapis.com/v1/places:searchText`

Headers:

- `Content-Type: application/json`
- `X-Goog-Api-Key: <key>`
- `X-Goog-FieldMask: <comma-separated fields, no spaces>` — required; omitting it
  returns an error. `*` returns everything and is not for production.

Body (JSON):

| Field | Notes |
| --- | --- |
| `textQuery` | Required. The search string, e.g. "Spicy Vegetarian Food in Sydney, Australia". |
| `pageSize` | 1–20, default 20; values above 20 are capped. |
| `pageToken` | The `nextPageToken` of the previous response. Every other parameter except `pageSize` must match the previous request or the API returns `INVALID_ARGUMENT`. |
| `languageCode` | Defaults to `en`. |
| `regionCode` | Two-character CLDR code; formats the response and can bias results. |
| `locationBias` | Optional circle (`center.latitude`, `center.longitude`, `radius` 0–50000 m) or rectangle. |
| `includedType`, `minRating`, `openNow`, `rankPreference`, … | Optional; not used by us. |

Results are capped at 60 across all pages.

## Response

`{ "places": [Place, …], "nextPageToken": "…" }` — each Place holds only the
fields in the mask; some may be absent (a service-area business has no
`formattedAddress`).

Fields we ask for, with the billing tier each one triggers:

| Field | Tier |
| --- | --- |
| `places.id`, `nextPageToken` | Essentials (ID only) |
| `places.displayName` (`text`, `languageCode`), `places.formattedAddress`, `places.googleMapsUri`, `places.businessStatus` | Pro |
| `places.internationalPhoneNumber`, `places.websiteUri`, `places.rating`, `places.userRatingCount` | Enterprise |

Any field of a higher tier bills the whole request at that tier, so our
searches bill as **Text Search Enterprise**. One page of up to 20 results is one
request.

## What it does not give

No email address and no person. The console reads the business's own website
for a published email and Instagram account (`lib/server/site-contacts.ts`), and
live research finds who to ask.
