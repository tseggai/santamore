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

### Speed: the region and the public cache

`vercel.json` pins the serverless functions to Frankfurt (`fra1`), the
region the Supabase project runs in, so every query is a short hop instead
of a transatlantic one. The public pages read the `v_public_*` views through
`lib/public-data.ts`: a cookie-less anon client inside Next's data cache,
one result per page (and locale, slug or year) refreshed every 60 seconds
and shared by every visitor. A public figure may therefore be up to a minute
old; the console reads live, and the test-mode switch drops the whole cache
(`revalidatePublic()`). Fundraiser, team and award pages stay live, so a
donor sees their gift the moment they return to the page.

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

Subject: `Prijava · Sign in · Вход — Santamore`. Supabase sends one template
to everyone and does not know the person's language, so the body carries
all three. "60 minutes" is the default OTP expiry (Authentication →
Providers → Email); change the sentences if you change it.

```html
<h2 style="margin:0 0 16px">Santamore</h2>

<p><strong>Prijava</strong><br>
Pritisni dugme da se prijaviš. Link važi jednom, 60 minuta. Ako ne radi, unesi kod ispod na stranici za prijavu.</p>

<p><strong>Sign in</strong><br>
Press the button to sign in. The link works once, for 60 minutes. If it does not work, enter the code below on the sign-in page.</p>

<p><strong>Вход</strong><br>
Нажмите кнопку, чтобы войти. Ссылка действует один раз, 60 минут. Если она не работает, введите код ниже на странице входа.</p>

<p style="margin:24px 0">
  <a href="{{ .SiteURL }}/me/potvrda-prijave?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}"
     style="display:inline-block;background:#0E3A46;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">
    Prijavi se · Sign in · Войти
  </a>
</p>

<p>Kod · Code · Код:<br>
<strong style="font-size:22px;letter-spacing:0.15em">{{ .Token }}</strong></p>

<p style="color:#666;font-size:13px">Ako nisi tražio/la prijavu, zanemari ovaj e-mail. · If you did not ask to sign in, ignore this email. · Если вы не запрашивали вход, проигнорируйте это письмо.</p>
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
