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

### The "Magic Link" email template (Authentication → Emails)

The link and the code in the email are the same one-time token. Supabase's
default template links straight to its verify endpoint, which spends the
token on a plain GET, so Gmail's link scanner, Outlook Safe Links or an iOS
link preview opening the link in the background makes both the link and the
code "wrong or expired" before the person has done anything. The fix is a
link to our own page, which spends the token only when the person presses
the button:

```html
<h2>Santamore</h2>
<p><a href="{{ .SiteURL }}/me/potvrda-prijave?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}">Prijavi se · Sign in · Войти</a></p>
<p>Kod · Code · Код: <strong>{{ .Token }}</strong></p>
```

Keep `{{ .Token }}` in the template: the code is the fallback when the link
is opened in another browser. Do not put `{{ .ConfirmationURL }}` anywhere in
the template, or the scanner problem returns. The page reads the person's
locale from the redirect, so the `/me/` in the link is only a starting
point.

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

Until SMTP is in place, "Error sending confirmation email" on the sign-in
form is this mailer refusing — not the app. The form also offers a password
path (Authentication → Providers → Email: keep **Confirm email** on; "My
giving" only trusts confirmed addresses, migration 0027), which spares
returning members an email per sign-in but still needs one delivery to
confirm a new account.

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

## 5. Post translation (optional)

The post editor can draft the other two languages from the one you wrote.
It calls the Claude API server-side and needs `ANTHROPIC_API_KEY` in the
Vercel environment (server-only; never `NEXT_PUBLIC_`). Without it the
Translate button explains that it is not set up. Every translation lands in
the editor as a draft: a person reads it before it is saved or published.
