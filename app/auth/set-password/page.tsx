"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { PasswordField } from "@/components/auth/auth-card";
import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { validateNewPassword } from "@/lib/auth-flow";
import { useApp } from "@/state/app-provider";

export default function SetPasswordPage() {
  const { state, config, passwordLink, updatePassword } = useApp();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const signedIn = state.user?.provider === "supabase";
  const canChange = passwordLink.status === "ready" || (passwordLink.status === "none" && signedIn);
  const account = passwordLink.status === "ready" ? passwordLink.email : signedIn ? state.user?.email : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const invalid = validateNewPassword(password, confirmation);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmation("");
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <PageHeader eyebrow="Account security" title="Set your password" description="Choose a password for your BusTrack account." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" /> Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config.publicConfigured ? (
            <Alert tone="info" title="Demo mode">Account passwords are available after Supabase Auth is configured.</Alert>
          ) : saved ? (
            <>
              <Alert tone="success" title="Password saved">You can now use this password to sign in.</Alert>
              <ButtonLink href="/login" className="w-full">Go to sign in</ButtonLink>
            </>
          ) : passwordLink.status === "verifying" || state.authLoading ? (
            <Alert tone="info">Checking your account link…</Alert>
          ) : passwordLink.status === "invalid" ? (
            <>
              <Alert tone="warning" title="Link invalid or expired">Request a new reset link, or ask the transport administrator for another invitation.</Alert>
              <ButtonLink href="/login?reset=1" variant="outline" className="w-full">Request a reset link</ButtonLink>
            </>
          ) : !canChange ? (
            <>
              <Alert tone="info" title="Sign in required">Sign in or open the password link from your email to continue.</Alert>
              <div className="grid gap-2 sm:grid-cols-2">
                <ButtonLink href="/login" variant="outline">Sign in</ButtonLink>
                <ButtonLink href="/login?reset=1" variant="ghost">Forgot password?</ButtonLink>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-600">
                {passwordLink.status === "ready" && passwordLink.kind === "invite" ? "Complete your invitation" : "Update the password"}
                {account ? <> for <strong className="break-all text-navy-950">{account}</strong></> : " for your account"}.
              </p>
              {error && <Alert tone="error" title="Password not saved" onDismiss={() => setError(null)}>{error}</Alert>}
              <form className="space-y-4" onSubmit={(event) => void submit(event)}>
                <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
                <PasswordField id="confirm-new-password" label="Confirm new password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
                <p className="text-xs leading-5 text-slate-500">Use at least 8 characters and a unique password.</p>
                <Button type="submit" className="w-full" loading={loading}>Save password</Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
