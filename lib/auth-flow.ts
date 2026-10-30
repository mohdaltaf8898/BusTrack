export const PASSWORD_PAGE = "/auth/set-password";

export type PasswordLinkKind = "invite" | "recovery";
export type PasswordLinkStatus =
  | { status: "none" }
  | { status: "verifying"; kind: PasswordLinkKind }
  | { status: "ready"; kind: PasswordLinkKind; userId: string; email: string | null }
  | { status: "invalid" };

/** Inspect the callback without retaining the tokens in application state. */
export function inspectPasswordCallback(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const type = hash.get("type") ?? url.searchParams.get("type");
  const kind: PasswordLinkKind | null = type === "invite" || type === "recovery" ? type : null;
  const hasError = Boolean(
    hash.get("error") || hash.get("error_code") || hash.get("error_description") ||
      url.searchParams.get("error") || url.searchParams.get("error_code"),
  );
  const hasTokens = Boolean(hash.get("access_token") && hash.get("refresh_token"));
  const incoming = Boolean(kind || hasError);
  // This client uses Supabase's implicit email-link flow. A bare `type` or
  // PKCE code is not proof of a valid recovery session.
  const malformed = hasError || Boolean(kind && !hasTokens);
  // Supabase dashboard invitations default to the site URL. Route them to the
  // password page before the client consumes and removes the URL fragment.
  const redirect = incoming && url.pathname !== PASSWORD_PAGE
    ? `${PASSWORD_PAGE}${url.search}${url.hash}`
    : null;
  return { kind, incoming, malformed, redirect };
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return "Use at least 8 characters for your password.";
  if (new TextEncoder().encode(password).length > 72) return "The password must be at most 72 UTF-8 bytes.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

/** Only same-origin, fixed paths are used as email redirect targets. */
export function authRedirect(origin: string, path: "/login" | typeof PASSWORD_PAGE): string {
  if (path !== "/login" && path !== PASSWORD_PAGE) throw new Error("Unsupported authentication redirect.");
  return new URL(path, origin).toString();
}

/** Use the already-verified token, not a mutable session that can switch tabs. */
export async function updatePasswordForToken(
  baseUrl: string,
  anonKey: string,
  accessToken: string,
  password: string,
): Promise<void> {
  const endpoint = new URL("/auth/v1/user", baseUrl);
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Your session has expired. Sign in or request a new password link.");
    }
    if (response.status === 400 || response.status === 422) {
      throw new Error("The password was rejected by the account policy. Try a different password.");
    }
    throw new Error("Could not update the password. Please try again.");
  }
}
