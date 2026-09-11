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

### Custom SMTP (required before real sign-ups)

Supabase's built-in mailer sends only a handful of auth emails per hour and
only to project team members. Authentication → **Emails** → **SMTP
Settings** tab (older dashboards: Project Settings → Authentication):

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key (the same one as `RESEND_API_KEY`) |
| Sender | an address on a domain verified in Resend, e.g. `[[PLACEHOLDER: no-reply@santamore.me]]` |

Then raise the per-hour email limit under Authentication → Rate Limits.

## 4. Strava → My API Application

| Field | Value |
|---|---|
| Authorization Callback Domain | the canonical hostname without scheme, e.g. `www.santamore.me` (Strava accepts the registered domain; register the exact host you serve) |
| Webhook | created from the admin Challenges screen once `NEXT_PUBLIC_SITE_URL` is live |

## 5. Google and Apple sign-in (optional)

The sign-in form shows a "Continue with Google / Apple" button for each
provider named in `NEXT_PUBLIC_AUTH_PROVIDERS` (`google,apple`). Keep the
variable empty until the provider works end to end; the magic link and the
6-digit code always remain.

**Google.** Google Cloud console → APIs & Services → Credentials → Create
OAuth client ID (Web application). Authorised JavaScript origin: the
canonical origin. Authorised redirect URI: the value Supabase shows under
Authentication → Sign In / Providers → Google (`https://<project-ref>.supabase.co/auth/v1/callback`).
Paste the client ID and secret into that Supabase screen and enable it.
The consent screen needs the app name, the logo and the privacy-policy URL
(`/pravila-privatnosti`) before Google lets people outside the test list
sign in.

**Apple.** Needs a paid Apple Developer account. Certificates, Identifiers
& Profiles → register an App ID with "Sign in with Apple", then a Services
ID (this is the client ID) with the site's domain and the same Supabase
return URL, then a Sign in with Apple key. Supabase's Apple provider takes
the Services ID, the Team ID, the Key ID and the key file; the secret it
derives expires every six months and must be regenerated. Note that Apple
lets people hide their email behind a relay address, so a donation made
with the person's real email will not appear under "My giving" for an
account created that way — Google, and the magic link, always carry the
real address.

## Checklist for a sign-in loop

1. Which host is in the address bar at each step? They must all be the same.
2. Is `NEXT_PUBLIC_SITE_URL` set for Production and has the site been redeployed since?
3. Does the Supabase Redirect URLs list contain `<canonical origin>/**`?
4. Is the Strava callback domain the same hostname?
