# Email delivery (SMTP) for student sign-up

BusTrack keeps **email confirmation on**, so a password account cannot sign in until the student
opens the confirmation link. That only works for ordinary students once the Supabase project sends
through a real SMTP provider.

## Why the default sender is not enough

Supabase's built-in sender is a development convenience:

| | Default Supabase sender | Custom SMTP |
| --- | --- | --- |
| Throughput | 2 auth emails per hour | Starts at 30/hour, raisable under Authentication → Rate Limits |
| Recipients | Supabase organisation members only | Any address |
| Template editing | Locked on new free projects (since June 2026) | Unlocked |
| Suitability | Local testing | Production sign-up |

The active BusTrack project (`tshpnbrulzjuhkjuexep`) is configured for Brevo
(`smtp-relay.brevo.com:587`) as of 6 November 2026. If emails do not arrive, work through
[Troubleshooting](#troubleshooting-emails-do-not-arrive) below before changing anything else.

## The free, easy path (about 15 minutes)

### Option A — Resend (simplest, recommended)

Free tier: 3,000 emails/month, 100/day. Enough for a student cohort signing up over a few days.

1. Create a free account at https://resend.com.
2. **Domains → Add Domain** and add a domain you control (for example `bustrack.example.edu`).
3. Add the DNS records Resend shows you (SPF `TXT`, DKIM `TXT`, and the optional MX for return
   path). Wait for the domain to show **Verified**.
4. **API Keys → Create API Key** with sending permission. Copy the key (`re_…`). It is a secret.
5. In the Supabase dashboard: **Authentication → Providers → Email → SMTP Settings**, switch
   **Enable Custom SMTP** on and enter:

   | Supabase field | Value |
   | --- | --- |
   | `SMTP_HOST` | `smtp.resend.com` |
   | `SMTP_PORT` | `465` |
   | `SMTP_USER` | `resend` |
   | `SMTP_PASS` | your `re_…` API key |
   | `SMTP_ADMIN_EMAIL` | `noreply@your-verified-domain` |
   | `SMTP_SENDER_NAME` | `BusTrack Transport` |

6. Raise **Authentication → Rate Limits → Emails sent** to something inside the free daily cap
   (for example `60` per hour).
7. Test with a real sign-up on https://bustrack-eight.vercel.app/signup, then confirm the link.

### Option B — Brevo (largest free volume)

Free tier: 300 emails/day (~9,000/month). Three Brevo details catch almost everyone:

1. Create a free account at https://www.brevo.com and **complete the account profile** (company
   name, verified phone number). Brevo reviews new accounts before it lets them send transactional
   email.
2. Open the top-right account menu → **SMTP & API → SMTP tab**.
   - If the page shows a banner like **"Your SMTP account is not yet activated"**, create a support
     ticket from that page asking for transactional sending to be activated. Until Brevo approves
     it, the relay answers every message with `450 Your SMTP account is not yet activated` and
     nothing is delivered, however correct the rest of the setup is.
   - Copy the **Login** shown on that tab. On accounts created since 2024 it looks like
     `7abc123001@smtp-brevo.com` — it is **not** your Brevo account email. If the tab shows your own
     email as the login and sending fails with `535 Authentication failed`, regenerate the SMTP
     credentials on that page and use the new `…@smtp-brevo.com` login.
   - Click **Generate a new SMTP key**. The value starts with `xsmtpsib-` and is shown once. Do not
     use an API key (`xkeysib-…`); the relay rejects those.
3. **Senders, Domains & Dedicated IPs → Senders**: the address you give Supabase as the sender must
   be listed there as verified. The account email is verified automatically; anything else needs its
   own verification. A personal `@gmail.com` sender works but often lands in spam because Gmail's
   DKIM cannot align with Brevo's signature — authenticate a domain you control for real use.
4. In Supabase, **Authentication → Emails → SMTP Settings** (older dashboards: Providers → Email →
   SMTP Settings), switch **Enable Custom SMTP** on and enter:

   | Supabase field | Value |
   | --- | --- |
   | `Host` | `smtp-relay.brevo.com` |
   | `Port` | `587` |
   | `Username` | the Login from the SMTP tab (`…@smtp-brevo.com`) |
   | `Password` | the `xsmtpsib-…` SMTP key, no leading/trailing spaces |
   | `Sender email` | a verified Brevo sender |
   | `Sender name` | `BusTrack Transport` |

   Save, then test with a **new** email address on https://bustrack-eight.vercel.app/signup.

### Option C — A college/institutional SMTP server

If Lords Institute already runs a mail server, ask the IT administrator for the relay host, port,
username and an application password, plus permission to send from
`transport@<college-domain>`. Institutional relays usually require SPF/DKIM alignment, so send from
the college domain rather than a personal one.

## After SMTP is configured

- Keep **Confirm email** enabled (BusTrack relies on it).
- Confirm **Authentication → URL Configuration**:
  - Site URL: `https://bustrack-eight.vercel.app`
  - Redirect URLs: `https://bustrack-eight.vercel.app/**` and, for local development,
    `http://localhost:3000/**`.
- The confirmation link returns the student to `/login`, where the Supabase client consumes the
  hash fragment and signs them in.
- Password recovery uses the same sender and returns to `/auth/set-password`.

## Troubleshooting: emails do not arrive

Supabase Auth sends the email inside the same database transaction that creates the account or
records the reset request. If the SMTP relay refuses the message, the transaction is rolled back:
no user row is created, `confirmation_sent_at` / `recovery_sent_at` stay empty, and the app shows
an error. Read the symptom, not the inbox:

| What you see | What it means | Where to look |
| --- | --- | --- |
| Red notice "The account email could not be sent. The transport administrator needs to configure SMTP delivery" | Brevo rejected the SMTP session. `535` = wrong login or key (account email used as login, API key used as password, stray space). `450 … not yet activated` = Brevo has not activated transactional sending. Unverified sender addresses are also refused. | Supabase dashboard → **Logs → Auth** (filter `error`) shows Brevo's exact reply. |
| Green notice "check your inbox…" but nothing arrives | Brevo accepted the message. It is in the spam folder, Brevo delayed it, or the address already had a confirmed account (Supabase then sends nothing, by design, so addresses cannot be enumerated). | Brevo → **Transactional → Logs / Statistics**; the recipient's spam folder; `select email, confirmation_sent_at from auth.users` in the SQL editor. |
| "Too many emails were requested" | Supabase allows one email per address per 60 seconds and 30 auth emails per hour by default. | Authentication → Rate Limits. |
| No sign-up attempt appears anywhere | The test never reached Supabase (for example a sign-in instead of a sign-up, or a browser that lost its connection). | Try again from an incognito window with a brand-new address. |

Quick checks against the project configuration (Supabase → Authentication → Emails → SMTP):

- Username ends in `@smtp-brevo.com` (unless Brevo's SMTP tab explicitly shows your account email).
- Password is an SMTP key (`xsmtpsib-…`), not an API key (`xkeysib-…`), and not the Brevo password.
- Sender email is verified under Brevo → Senders.
- Brevo's SMTP tab shows no "not yet activated" banner.
- The Supabase project's Site URL and Redirect URLs still point at `https://bustrack-eight.vercel.app`.

## What still will not work without SMTP

- Student self sign-up with email and password (the account is created but stays unconfirmed).
- Password reset links.
- Dashboard invitations to drivers and administrators.

Google sign-in does **not** depend on SMTP — see [docs/AUTH.md](AUTH.md).
