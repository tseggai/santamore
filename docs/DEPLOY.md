# Deploying Santamore

Three services have to agree on one hostname. When they don't, sign-in
loops: a session cookie is set on one host and the next request lands on
another host that cannot see it.

## 1. Pick the canonical host

`https://www.santamore.me` (or the apex — one or the other, never both).
Everything below uses that exact value.

## 2. Vercel

| Where | Setting |
|---|---|
| Settings → Domains | Add both `www.santamore.me` and `santamore.me`; mark the non-canonical one as "Redirect to" the canonical one. |
| Settings → Environment Variables (Production) | `NEXT_PUBLIC_SITE_URL` = canonical origin, no trailing slash. |
| Deployments | Redeploy after changing any `NEXT_PUBLIC_*` variable — they are inlined at build time. |

The app also enforces this itself: in production the middleware answers any
other host (the apex, `santamore.vercel.app`) with a 308 to the canonical
one, path and query intact. Preview deployments keep their own hosts.

## 3. Supabase → Authentication → URL Configuration

| Field | Value |
|---|---|
| Site URL | the canonical origin, e.g. `https://www.santamore.me` |
| Redirect URLs | `https://www.santamore.me/**`, `https://santamore.me/**`, `https://santamore.vercel.app/**`, `https://*-<team>.vercel.app/**` (previews), `http://localhost:3000/**` |

The magic link asks Supabase to return to `/api/auth/callback?next=…` on the
host the person signed in from. Supabase honours that only when the URL
matches the allow-list; otherwise it silently falls back to the Site URL,
which drops the path (so the person lands on the homepage instead of their
console) and, before this was handled in the middleware, dropped the code as
well. The allow-list is therefore not optional.

The "Magic Link" email template must contain `{{ .Token }}` so the 6-digit
code reaches the inbox for people whose mail scanner consumes the link.

## 4. Strava → My API Application

| Field | Value |
|---|---|
| Authorization Callback Domain | the canonical hostname without scheme, e.g. `www.santamore.me` (Strava accepts the registered domain; register the exact host you serve) |
| Webhook | created from the admin Challenges screen once `NEXT_PUBLIC_SITE_URL` is live |

## Checklist for a sign-in loop

1. Which host is in the address bar at each step? They must all be the same.
2. Is `NEXT_PUBLIC_SITE_URL` set for Production and has the site been redeployed since?
3. Does the Supabase Redirect URLs list contain `<canonical origin>/**`?
4. Is the Strava callback domain the same hostname?
