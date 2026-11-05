# Accounts, roles and Google sign-in

## Access model

BusTrack has **no credential-free demo**. The public site is an introduction only:

| Path | Access |
| --- | --- |
| `/` | Public introduction page |
| `/login`, `/signup`, `/auth/set-password`, `/auth/callback` | Public account screens |
| `/dashboard`, `/track`, `/routes`, `/notifications`, `/bus-details`, `/profile` | Signed-in student, driver or administrator |
| `/driver` | Signed-in driver or administrator |
| `/admin` | Signed-in administrator |
| `/api/*` | Bearer access token plus a profile role check |

`app/(app)/layout.tsx` wraps every workspace route in `RequireAuth`, which redirects a signed-out
visitor to `/login?next=<path>`. That is a navigation gate: the Supabase session lives in the
browser, so the real enforcement is Postgres row-level security plus `requireApiUser()` in
`lib/server/auth.ts`, which validates the access token and reads the role from `profiles` on every
privileged request. Roles are never taken from the client.

Signing up always creates the `student` role. `prevent_role_escalation` in the database means only
an existing administrator can change a role.

## Google sign-in

The Google button on `/login` and `/signup` appears only when Supabase reports the provider as
enabled. `lib/auth-providers.ts` reads `GET {project}/auth/v1/settings` (a public endpoint) and
checks `external.google`; otherwise the card explains that an administrator has not switched it on.

The active project currently reports `external_google_enabled = false` with no client ID, so the
button is intentionally hidden until these steps are done.

### 1. Create the Google OAuth client

1. Open https://console.cloud.google.com and create or select a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name
   (`BusTrack`), a support email and your developer email. Add the scopes
   `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. Publish the app
   (or add test users while it is in "Testing").
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://bustrack-eight.vercel.app` and `http://localhost:3000`
   - Authorized redirect URIs — Supabase's callback, **not** a BusTrack path:
     - `https://tshpnbrulzjuhkjuexep.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` is *not* used by Google; Supabase always receives the
       provider callback first and then redirects the browser to your `redirectTo` value.
4. Copy the **Client ID** and **Client secret**.

### 2. Enable the provider in Supabase

1. Supabase dashboard → project `tshpnbrulzjuhkjuexep` → **Authentication → Providers → Google**.
2. Switch **Enable Google provider** on and paste the Client ID and Client secret. Save.
   Never commit these values to the repository and never paste the secret into chat.
3. **Authentication → URL Configuration**:
   - Site URL: `https://bustrack-eight.vercel.app`
   - Redirect URLs: `https://bustrack-eight.vercel.app/**`, `http://localhost:3000/**`
4. Apply the migration
   `supabase/migrations/20261105120000_bustrack_oauth_profile_name.sql`. It reads `full_name` /
   `nickname` from the OAuth metadata so a Google account gets a real display name instead of the
   local part of the email. The role stays hard-coded to `student`.

### 3. How the round trip works in BusTrack

1. `signInWithGoogle(next)` calls `supabase.auth.signInWithOAuth({ provider: "google" })` with
   `redirectTo = {origin}/auth/callback?next={sanitizedPath}`.
2. `oauthCallbackUrl()` and `sanitizeInternalPath()` in `lib/auth-flow.ts` reject anything that is
   not a same-origin path, so a crafted `next` value cannot send a student to another site after
   authenticating.
3. Google redirects to Supabase, Supabase redirects back to `/auth/callback` with the session in
   the URL hash. `detectSessionInUrl` in the app provider exchanges it and fires `SIGNED_IN`.
4. `/auth/callback` waits for the session and then replaces the URL with `next`
   (default `/dashboard`). If Supabase returns `error` / `error_description`, the page explains the
   failure — most often a missing redirect allow-list entry or a disabled provider — and offers a
   way back to sign-in. It gives up after 20 seconds rather than spinning forever.

### Local development notes

- `http://localhost:3000/**` must be in the Supabase redirect allow-list or the callback is
  rejected with `redirect_to not allowed`.
- Google requires the OAuth client to list the *Supabase* callback URI. The browser only ever
  returns to your own origin.
- If the button does not appear, the settings endpoint said Google is off. Reload after enabling
  the provider; `lib/auth-providers.ts` caches the answer for the page session.
