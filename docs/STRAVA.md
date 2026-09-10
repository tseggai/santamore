# Strava and partner perks

How a run on Strava becomes a smoothie at a partner cafe, what Strava's API
allows, and what must be configured. Sources: developers.strava.com
(webhooks, authentication, rate limits, reference, brand guidelines) and the
Strava API Agreement at strava.com/legal/api, all read on 2026-09-10.

## The product

A **partner challenge** (`/izazovi`, table `perk_challenges`) is a rule plus a
reward, defined by staff in `/admin/izazovi`:

| Field | "5 km a day" (cafe) | "Fast 5" | "3 runs a week" (Lotta) |
|---|---|---|---|
| Sports | Run, Trail run, Virtual run | Run | Run, Trail run |
| Minimum distance | 5 km | 5 km | 5 km |
| Maximum moving time | — | 25 min | — |
| Maximum pace | — | — | 6:00 /km |
| Required days / window | 1 | 1 | 3 days in 7 |
| Reward | 1 smoothie | 1 smoothie | 1 energy drink |
| Per athlete per day | 1 | 1 | 1 |
| Partner capacity per day | 5 | 5 | 10 |
| Code valid for | 7 days | 7 days | 14 days |

The partner is the author of the offer; Santamore only hosts the rule, the
verification and the code. Each challenge carries the partner's name, an
optional link, and the partner's own redemption PIN. Nothing requires a
fundraising page: anyone can sign in with an email, connect Strava and take
part — and the Strava page nudges them towards starting a page later.

Rule semantics: a single-run rule (required days = 1) pays per qualifying
activity, within the caps. A multi-day rule pays when the athlete has
qualifying activities on N distinct days inside a rolling window of W days
ending on the day of the activity that completes it, and at most once per
athlete per window. Pace is moving time divided by distance.

The flow for a runner:

1. Sign in to the dashboard and **connect Strava** (`/dashboard/strava`). We
   ask for `read,activity:read` (public activities only).
2. Run. Strava posts a webhook event; we fetch the activity and evaluate it
   against every active challenge in one database transaction
   (`evaluate_activity_perks`).
3. A qualifying run mints an **award code** (8 characters, e.g. `K7PM2XQA`)
   with a QR page at `/r/<code>`. The runner opens it from the dashboard and
   shows it at the cafe, or shares the link.
4. The cafe scans the QR, lands on the same page, enters its **PIN** and the
   code is marked redeemed. Five wrong PINs in fifteen minutes lock the code
   for the window.

Caps are enforced inside the database under a row lock per challenge, so two
simultaneous webhooks cannot mint a sixth smoothie on a five-a-day partner.

## Strava API facts we rely on

- **OAuth**: `GET https://www.strava.com/oauth/authorize` with `client_id`,
  `redirect_uri`, `response_type=code`, `scope`, `state`; exchange at
  `POST https://www.strava.com/api/v3/oauth/token` (`grant_type=authorization_code`).
  Access tokens live 6 hours; refresh with `grant_type=refresh_token` and always
  store the newest refresh token. Deauthorise with
  `POST https://www.strava.com/oauth/deauthorize` (from 2026-06-01 Strava also
  documents `/oauth/revoke` with Basic auth; we use the documented legacy
  endpoint, switch when it is retired).
- **Webhooks**: one subscription per application, created with
  `POST /api/v3/push_subscriptions` (`client_id`, `client_secret`,
  `callback_url`, `verify_token`). Strava validates the callback with a `GET`
  carrying `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`; we must
  answer `{"hub.challenge": "..."}` within 2 seconds. Events are `POST`ed as
  `{object_type, object_id, aspect_type, owner_id, subscription_id, event_time,
  updates}`; we must answer 200 within 2 seconds, and Strava retries up to
  3 times. Events cover activity create/update/delete and athlete
  deauthorisation (`updates.authorized = "false"`). **Events are not signed.**
- **Rate limits** (default): 200 requests / 15 min and 2,000 / day overall;
  100 / 15 min and 1,000 / day for read endpoints. Reported in
  `X-RateLimit-*` / `X-ReadRateLimit-*` headers. Higher limits require a
  Developer Program review with screenshots of the app.
- **Activity fields** we use: `id`, `name`, `sport_type` (`Run`, `TrailRun`,
  `VirtualRun`, …), `type`, `distance` (m), `moving_time` (s),
  `total_elevation_gain` (m), `start_date` (UTC), `start_date_local` (the
  athlete's calendar day, which decides "per day").

## How the rules of CLAUDE.md are met

- **"Webhook handlers must verify signatures before doing anything."**
  Strava provides no signature. The handler therefore never trusts the payload:
  it logs the event (idempotency key `strava:<type>:<id>:<aspect>:<time>` in
  `webhook_events`, `signature_valid = false` recorded honestly), answers 200,
  and only then **re-fetches the activity from Strava with the athlete's own
  token**. A forged event can at most make us re-read real data. The GET
  handshake compares the verify token in constant time.
- **Idempotent**: duplicate events (Strava retries) hit the unique key and
  return 200 without work. Activities upsert on `(source, external_id)`;
  awards are unique per `(challenge, activity)`.
- **Secrets are server-only**: client id, secret and verify token are plain
  env vars; tokens live in `strava_connections`, which no client role can
  read (owners see a column-level view without tokens).
- **Every mutation re-validates on the server**: the OAuth `state` is an HMAC
  over the user id and expiry, checked against the live session in the
  callback; redemption is a `SECURITY DEFINER` function that checks the
  bcrypt PIN hash itself.

## Compliance with the Strava API Agreement — read before going live

Quotes from strava.com/legal/api:

- *"Strava Data provided by a specific user can only be displayed or disclosed
  in your Developer Application to that user."* We show an athlete's
  activities only to that athlete (`/dashboard/strava`). The partner sees the
  **award** (our record: reward, date, first name), never the activity. Public
  challenge-event standings include Strava-sourced activities **only** for
  athletes who ticked the consent box (`strava_connections.share_public`).
  → **Legal review needed** on whether the award itself, and the consent
  mechanism for standings, satisfy §2.3. Listed in docs/PLACEHOLDERS.md.
- *"Upon termination … permanently delete all … Strava Data."* Disconnecting,
  or deauthorising from Strava's side (webhook), deletes the tokens and every
  Strava-sourced activity (`forgetAthlete`). Awards remain as our own records
  with `activity_id` cleared.
- *"You may not create applications that compete with or replicate Strava
  functionality."* We do not show maps, segments, feeds or social features;
  a run is only an input to a reward or a fundraising challenge.
- **Brand**: the connect button must be Strava's official "Connect with
  Strava" asset and Strava-derived data must carry "Powered by Strava"; the
  text button and the caption in `StravaPanel` are placeholders until the
  assets are added (docs/PLACEHOLDERS.md). Link back with "View on Strava"
  where we show an activity.

## Setup

**Account and capacity facts (developers.strava.com/docs/getting-started and
/docs/rate-limits, read 2026-09-10):**

- There is no "business account". Any personal Strava account creates the
  application at strava.com/settings/api — but **a Strava subscription is a
  prerequisite for creating an app**. Use an account the organisation
  controls (a shared Santamore login, not a volunteer's personal one), since
  the client secret, the webhook and the athlete cap belong to that account.
- New apps start in **single-player mode: only the owner's own athlete can
  connect** — and the owner's own athlete already fills that slot, so the
  very first outside runner sees Strava's own page "Error 403: Limit of
  connected athletes exceeded". That page is Strava's; our callback is
  never reached, so nothing in the app can catch it. From the API settings dashboard you can raise it yourself to
  **10 athletes** (with 400 requests / 15 min, 4,000 / day). Beyond 10 you
  must submit the app to the Developer Program review with screenshots of
  every place Strava data is shown and of the "Connect with Strava" button,
  and no further athletes can connect until approval. Increased access "is
  not a guarantee". Plan the review weeks before the first partner
  challenge opens to the public.
- The API Agreement binds whoever registers: an individual over 18 or a
  representative with authority to bind the entity. Register in the
  organisation's name.

1. Create an API application at https://www.strava.com/settings/api.
   *Authorization Callback Domain* = the site host (e.g. `santamore.me`;
   for previews, the Vercel preview host). Note the client id and secret.
2. Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` and a long random
   `STRAVA_WEBHOOK_VERIFY_TOKEN` in the environment (`.env.example`).
3. Apply migration `20260910000009_campaign_pages_strava_perks.sql`.
4. Deploy, then open `/admin/izazovi` and click **Register webhook**. It
   creates the single subscription for `https://<host>/api/webhooks/strava`
   (replacing one pointing elsewhere). Strava validates the URL immediately,
   so the deployment must be live first.
5. Create a challenge, set the partner's PIN, tick *Active*.
6. Ask Strava for a higher rate limit once real athletes connect: with
   defaults, roughly 900 activity fetches a day are available.

## Design notes and limits

- Only **Strava-sourced** activities qualify unless a challenge explicitly
  allows manual entries (`allow_manual`) — manual logs are unverifiable.
- "Per day" is the athlete's local calendar day from `start_date_local`,
  which for a Bay of Kotor runner is Europe/Podgorica. Caps and "left today"
  counters use Europe/Podgorica.
- Connecting imports the last 30 days for challenge-event standings but
  evaluates perks **only for today's activities**, so joining never rewards
  old runs. A manual "Sync now" pulls 7 days, at most once per 10 minutes.
- Deleting an activity on Strava revokes its unredeemed award.
- Private activities are invisible under `activity:read`; a runner whose
  activities default to private must make the qualifying run public (or we
  request `activity:read_all` later — a scope change needs re-consent).
- Strava's `sport_type` is normalised by removing spaces (`Trail Run` →
  `TrailRun`) so both old and new payload shapes match.
- Deployment note: the webhook handler uses `after()` from `next/server` so
  Strava gets its 200 before we call back into Strava.

## Ideas for the partner programme (not built)

- Streaks ("5 km every day this week") — needs a per-challenge window type
  and a small state table; the engine already keys awards by date.
- Group challenges for teams; partner dashboards with their own login;
  redemption via a partner app instead of a PIN page.
