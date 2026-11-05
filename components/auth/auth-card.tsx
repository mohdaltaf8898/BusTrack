"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import { m } from "motion/react";
import { SPRING } from "@/lib/motion";
import { validateNewPassword } from "@/lib/auth-flow";
import { fetchAuthProviders, type AuthProviderState } from "@/lib/auth-providers";
import { useApp } from "@/state/app-provider";
import { GoogleButton } from "@/components/auth/google-button";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Collapsible } from "@/components/ui/feedback";
import { Input, Label } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup" | "reset";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pl-9 pr-12"
          required
        />
        <button
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function authError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/email address not authorized|error sending (confirmation|recovery|invite)|smtp/i.test(message)) {
    return "The account email could not be sent. The transport administrator needs to configure SMTP delivery (see docs/EMAIL.md).";
  }
  if (/signup.*disabled|signups.*disabled|sign.?up.*disabled/i.test(message)) {
    return "Account sign-up is currently disabled. Contact the transport administrator.";
  }
  if (/rate.?limit|too many|over_email_send_rate_limit/i.test(message)) {
    return "Too many emails were requested. Supabase limits the default sender, so wait a while or use Google sign-in.";
  }
  if (/provider.*not enabled|oauth.*not|external provider/i.test(message)) {
    return "Google sign-in is not enabled for this deployment yet. Use email and password, or ask the administrator to add the Google provider.";
  }
  return message || fallback;
}

/** Reads which sign-in providers Supabase actually has switched on. */
export function useAuthProviders(): AuthProviderState {
  const [providers, setProviders] = useState<AuthProviderState>({
    google: false,
    emailSignUp: true,
    checked: false,
  });
  useEffect(() => {
    let active = true;
    void fetchAuthProviders().then((state) => {
      if (active) setProviders(state);
    });
    return () => {
      active = false;
    };
  }, []);
  return providers;
}

export function AuthCard({
  initialMode = "signin",
  next = null,
}: {
  initialMode?: AuthMode;
  next?: string | null;
}) {
  const { state, config, signIn, signInWithGoogle, signUp, requestPasswordReset } = useApp();
  const providers = useAuthProviders();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const modeIndicatorId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode === "reset") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") === "1") setMode("reset");
  }, [initialMode]);

  const chooseMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmation("");
    setError(null);
    setNotice(null);
  };

  const startGoogle = async () => {
    setError(null);
    setNotice(null);
    setOauthLoading(true);
    try {
      await signInWithGoogle(next);
    } catch (caught) {
      setOauthLoading(false);
      setError(authError(caught, "Google sign-in could not start. Please try again."));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }
    if (mode === "signup") {
      if (!name.trim()) {
        setError("Enter your name.");
        return;
      }
      const invalid = validateNewPassword(password, confirmation);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    if (mode === "signin" && !password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(cleanEmail, password);
        setNotice("Signed in. Your access is based on your authorized profile.");
      } else if (mode === "signup") {
        const result = await signUp(name.trim(), cleanEmail, password);
        setNotice(result.signedIn
          ? "Your student account was created and you are signed in."
          : "If the address can be registered and email delivery is configured, check your inbox for a confirmation link.");
      } else {
        await requestPasswordReset(cleanEmail);
        setNotice("If an account exists and email delivery is configured, check your inbox for a password reset link.");
      }
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(authError(caught, "The request could not be completed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" /> Account access
          </CardTitle>
          <Badge tone={config.publicConfigured ? "green" : "amber"}>
            {config.publicConfigured ? "Supabase Auth" : "No backend"}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Sign in or create a student account. Driver and administrator access is approved separately.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.unconfigured && (
          <Alert tone="warning" title="This deployment has no Supabase credentials">
            Accounts cannot be created or verified until <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set and the migrations are applied. See{" "}
            <code>docs/SETUP.md</code>.
          </Alert>
        )}

        <GoogleButton
          mode={mode}
          enabled={providers.google && config.publicConfigured}
          loading={oauthLoading}
          onClick={() => void startGoogle()}
        />

        <div className="flex items-center gap-3" role="separator" aria-label="or use email and password">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-500">or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {mode !== "reset" && (
          <div className="grid grid-cols-2 gap-4 border-b border-slate-200" role="tablist" aria-label="Account action">
            {([
              { value: "signin" as const, label: "Sign in" },
              { value: "signup" as const, label: "Sign up" },
            ]).map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={mode === tab.value}
                onClick={() => chooseMode(tab.value)}
                className={cn("relative min-h-11 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", mode === tab.value ? "text-navy-950" : "text-slate-600 hover:text-navy-900")}
              >
                {tab.label}
                {mode === tab.value && (
                  <m.span
                    layoutId={modeIndicatorId}
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600"
                    transition={SPRING.gentle}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        )}
        {error && <Alert tone="error" title="Account error" onDismiss={() => setError(null)}>{error}</Alert>}
        {notice && !error && <Alert tone="info" onDismiss={() => setNotice(null)}>{notice}</Alert>}
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          {mode === "reset" && (
            <div>
              <p className="text-sm font-semibold text-navy-950">Reset your password</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">We’ll send a reset link if the account is eligible.</p>
            </div>
          )}
          <Collapsible show={mode === "signup"}>
            <div className="pb-4">
              <Label htmlFor="account-name">Name</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input id="account-name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="pl-9" required />
              </div>
            </div>
          </Collapsible>
          <div>
            <Label htmlFor="account-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input id="account-email" type="email" autoComplete={mode === "signin" ? "username" : "email"} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.edu" className="pl-9" required />
            </div>
          </div>
          {mode !== "reset" && (
            <PasswordField id="account-password" label="Password" value={password} onChange={setPassword} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          )}
          {mode === "signup" && (
            <>
              <PasswordField id="account-confirm-password" label="Confirm password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
              <p className="text-xs leading-5 text-slate-500">
                Use at least 8 characters. New accounts start as students and must confirm their
                email before they can sign in.
              </p>
            </>
          )}
          <Button type="submit" className="w-full" loading={loading} disabled={config.unconfigured || state.authLoading}>
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create student account" : "Send reset link"}
          </Button>
          {mode === "signin" ? (
            <button type="button" onClick={() => chooseMode("reset")} className="min-h-11 w-full rounded-xl text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              Forgot password?
            </button>
          ) : mode === "reset" ? (
            <button type="button" onClick={() => chooseMode("signin")} className="min-h-11 w-full rounded-xl text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              Back to sign in
            </button>
          ) : null}
          {state.user?.provider === "supabase" && (
            <ButtonLink href="/auth/set-password" variant="outline" className="w-full">Change password</ButtonLink>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
