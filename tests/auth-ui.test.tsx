import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signIn: vi.fn(async (_email: string, _password: string) => {}),
  signInWithGoogle: vi.fn(async (_next?: string | null) => {}),
  signUp: vi.fn(async (_name: string, _email: string, _password: string) => ({ signedIn: false })),
  requestPasswordReset: vi.fn(async (_email: string) => {}),
  updatePassword: vi.fn(async (_password: string) => {}),
  config: { publicConfigured: true, unconfigured: false },
  state: { authLoading: false, user: null as null | { id: string; email: string; provider: "supabase" } },
  passwordLink: { status: "none" } as { status: string; kind?: string; userId?: string; email?: string | null },
}));
vi.mock("@/state/app-provider", () => ({ useApp: () => auth }));

import { AuthCard } from "@/components/auth/auth-card";
import SetPasswordPage from "@/app/auth/set-password/page";

beforeEach(() => {
  vi.clearAllMocks();
  auth.config.publicConfigured = true;
  auth.config.unconfigured = false;
  auth.state.authLoading = false;
  auth.state.user = null;
  auth.passwordLink = { status: "none" };
  window.history.replaceState({}, "", "/login");
});

describe("sign-in and student sign-up", () => {
  it("signs in with email and password and clears the password", async () => {
    render(<AuthCard />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@example.edu" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/ }));
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith("student@example.edu", "a-secure-password"));
    expect(await screen.findByText(/Signed in\. Your access/)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("validates matching passwords and sends no requested role with sign-up", async () => {
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: "Sign up" }));
    expect(screen.getByText(/New accounts start as students/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Student Name" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@example.edu" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-password" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "mismatch" } });
    fireEvent.click(screen.getByRole("button", { name: "Create a student account" }));
    expect(await screen.findByText("The passwords do not match.")).toBeInTheDocument();
    expect(auth.signUp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "long-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create a student account" }));
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith("Student Name", "student@example.edu", "long-password"));
    expect(await screen.findByText(/check your inbox for a confirmation link/i)).toBeInTheDocument();
  });

  it("offers a non-enumerating reset request", async () => {
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.edu" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => expect(auth.requestPasswordReset).toHaveBeenCalledWith("person@example.edu"));
    expect(await screen.findByText(/If an account exists/)).toBeInTheDocument();
  });

  it("explains email delivery failures rather than claiming the email arrived", async () => {
    auth.requestPasswordReset.mockRejectedValueOnce(new Error("Email address not authorized"));
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.edu" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/could not be sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/If an account exists/)).not.toBeInTheDocument();
  });

  it("treats Supabase's opaque recovery failure as a delivery problem", async () => {
    auth.requestPasswordReset.mockRejectedValueOnce(new Error("Unable to process request"));
    render(<AuthCard />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.edu" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/could not be sent/i)).toBeInTheDocument();
    expect(screen.queryByText(/Unable to process request/)).not.toBeInTheDocument();
  });

  it("keeps account submission disabled when the deployment has no backend", () => {
    auth.config.publicConfigured = false;
    auth.config.unconfigured = true;
    render(<AuthCard />);
    expect(screen.getByText(/This deployment has no Supabase credentials/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sign in$/ })).toBeDisabled();
  });

  it("hides the Google control until Supabase reports the provider as enabled", () => {
    render(<AuthCard />);
    expect(screen.getByText(/Google sign-in is not switched on yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with Google/i })).not.toBeInTheDocument();
    expect(auth.signInWithGoogle).not.toHaveBeenCalled();
  });
});

describe("password setting", () => {
  it("requires a real session or valid link", () => {
    render(<SetPasswordPage />);
    expect(screen.getByText("Sign in required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save password" })).not.toBeInTheDocument();
  });

  it("shows an expired link without enabling password changes even with an old session", () => {
    auth.state.user = { id: "old-user", email: "old@example.edu", provider: "supabase" };
    auth.passwordLink = { status: "invalid" };
    render(<SetPasswordPage />);
    expect(screen.getByText("Link invalid or expired")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save password" })).not.toBeInTheDocument();
  });

  it("sets the password for an accepted invitation", async () => {
    auth.passwordLink = { status: "ready", kind: "invite", userId: "new-user", email: "new@example.edu" };
    render(<SetPasswordPage />);
    expect(screen.getByText("new@example.edu")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "a-secure-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "a-secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith("a-secure-password"));
    expect(await screen.findByText("Password saved")).toBeInTheDocument();
  });
});
