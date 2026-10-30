import { afterEach, describe, expect, it, vi } from "vitest";
import { authRedirect, inspectPasswordCallback, updatePasswordForToken, validateNewPassword } from "@/lib/auth-flow";

afterEach(() => vi.unstubAllGlobals());

describe("authentication link handling", () => {
  it("routes a dashboard invitation to the password page without losing the fragment", () => {
    const result = inspectPasswordCallback("https://bustrack.example/#access_token=a&refresh_token=r&type=invite");
    expect(result).toEqual({
      kind: "invite", incoming: true, malformed: false,
      redirect: "/auth/set-password#access_token=a&refresh_token=r&type=invite",
    });
  });

  it("accepts a recovery fragment on the password page and rejects incomplete links", () => {
    expect(inspectPasswordCallback("https://bustrack.example/auth/set-password#access_token=a&refresh_token=r&type=recovery"))
      .toEqual({ kind: "recovery", incoming: true, malformed: false, redirect: null });
    expect(inspectPasswordCallback("https://bustrack.example/auth/set-password#type=recovery"))
      .toMatchObject({ kind: "recovery", malformed: true, redirect: null });
    expect(inspectPasswordCallback("https://bustrack.example/auth/set-password?code=unverified&type=recovery").malformed).toBe(true);
  });

  it("recognizes expired links but does not redirect normal sign-up confirmations", () => {
    expect(inspectPasswordCallback("https://bustrack.example/#error=access_denied&error_code=otp_expired"))
      .toMatchObject({ incoming: true, malformed: true, redirect: "/auth/set-password#error=access_denied&error_code=otp_expired" });
    expect(inspectPasswordCallback("https://bustrack.example/login#access_token=a&refresh_token=r&type=signup"))
      .toEqual({ kind: null, incoming: false, malformed: false, redirect: null });
  });

  it("uses only fixed, same-origin email redirects", () => {
    expect(authRedirect("https://bustrack.example", "/login")).toBe("https://bustrack.example/login");
    expect(authRedirect("https://bustrack.example", "/auth/set-password")).toBe("https://bustrack.example/auth/set-password");
    expect(() => authRedirect("https://bustrack.example", "//evil.example" as "/login")).toThrow();
  });
});

describe("new password validation and update", () => {
  it("rejects short, mismatched and overlong passwords", () => {
    expect(validateNewPassword("short", "short")).toMatch(/8 characters/);
    expect(validateNewPassword("long-enough", "different")).toMatch(/do not match/);
    expect(validateNewPassword("a".repeat(73), "a".repeat(73))).toMatch(/72 UTF-8 bytes/);
    expect(validateNewPassword("a secure password", "a secure password")).toBeNull();
  });

  it("submits the frozen access token to the fixed Auth endpoint", async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: "user-1" }));
    vi.stubGlobal("fetch", fetchMock);
    await updatePasswordForToken("https://project.supabase.co", "public-key", "captured-token", "a secure password");
    const [url, request] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://project.supabase.co/auth/v1/user");
    expect(request.method).toBe("PUT");
    expect(request.headers).toEqual({ apikey: "public-key", Authorization: "Bearer captured-token", "Content-Type": "application/json" });
    expect(request.body).toBe(JSON.stringify({ password: "a secure password" }));
  });

  it("surfaces an expired session without exposing the token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    await expect(updatePasswordForToken("https://project.supabase.co", "public-key", "secret-token", "a secure password"))
      .rejects.toThrow("Your session has expired");
  });
});
