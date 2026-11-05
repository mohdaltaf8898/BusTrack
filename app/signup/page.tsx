"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Alert } from "@/components/ui/feedback";
import { sanitizeInternalPath } from "@/lib/auth-flow";
import { useApp } from "@/state/app-provider";

const ASIDE = (
  <ol className="space-y-3 text-sm leading-6 text-slate-600">
    <li>
      <span className="font-semibold text-navy-950">1. Create the account.</span> Use your college
      email with a password, or continue with Google.
    </li>
    <li>
      <span className="font-semibold text-navy-950">2. Confirm the email.</span> Password accounts
      need the confirmation link before the first sign-in.
    </li>
    <li>
      <span className="font-semibold text-navy-950">3. Pick your route and stop.</span> Arrival
      estimates are calculated for the stop you choose.
    </li>
  </ol>
);

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useApp();
  const next = sanitizeInternalPath(params.get("next"), "/dashboard");

  useEffect(() => {
    // Only a completed session continues; a pending email confirmation does not.
    if (state.user) router.replace(next);
  }, [state.user, next, router]);

  return (
    <AuthScreen
      title="Create your student account"
      description="New accounts always start with the student role. Driver and administrator access is granted separately by the transport office."
      aside={ASIDE}
    >
      {state.user && (
        <Alert tone="success" className="mb-4">
          Account ready. Opening your dashboard…
        </Alert>
      )}
      <AuthCard initialMode="signup" next={next} />
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Already registered?{" "}
        <a href="/login" className="font-medium text-brand-700 underline underline-offset-2">Sign in instead</a>.
      </p>
    </AuthScreen>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
