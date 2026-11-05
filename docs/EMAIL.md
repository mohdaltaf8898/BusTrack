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

The active BusTrack project (`tshpnbrulzjuhkjuexep`) currently reports `smtp_host = null`, which
means it is still on the default sender.

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

Free tier: 300 emails/day (~9,000/month).

1. Create a free account at https://www.brevo.com and verify a sender domain.
2. **SMTP & API → SMTP** and generate an SMTP key.
3. Supabase SMTP fields: host `smtp-relay.brevo.com`, port `587`, user your Brevo login email,
   password the SMTP key, admin email an address on the verified domain.

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

## What still will not work without SMTP

- Student self sign-up with email and password (the account is created but stays unconfirmed).
- Password reset links.
- Dashboard invitations to drivers and administrators.

Google sign-in does **not** depend on SMTP — see [docs/AUTH.md](AUTH.md).
