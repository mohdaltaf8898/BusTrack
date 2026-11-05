"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Alert } from "@/components/ui/feedback";
import { sanitizeInternalPath } from "@/lib/auth-flow";
import { useApp } from "@/state/app-provider";

const ASIDE = (
  <ul className="space-y-2.5 text-sm leading-6 text-slate-600">
    <li className="flex gap-2.5">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
      Find your route and stop from the published 2025–26 pickup list.
    </li>
    <li className="flex gap-2.5">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
      See an estimated arrival time, always labelled as an estimate.
    </li>
    <li className="flex gap-2.5">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
      Get route alerts when a bus is delayed or a trip ends.
    </li>
  </ul>
);

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useApp();
  const next = sanitizeInternalPath(params.get("next"), "/dashboard");

  useEffect(() => {
    if (state.user) router.replace(next);
  }, [state.user, next, router]);

  return (
    <AuthScreen
      title="Sign in to BusTrack"
      description="Bus routes, stops, arrival estimates and alerts are only available to signed-in students, drivers and transport administrators."
      aside={ASIDE}
    >
      {state.user && (
        <Alert tone="success" className="mb-4">
          Signed in as {state.user.name}. Opening your dashboard…
        </Alert>
      )}
      <AuthCard initialMode="signin" next={next} />
      <p className="mt-4 text-xs leading-5 text-slate-500">
        No account yet? Use <strong>Sign up</strong> above or{" "}
        <a href="/signup" className="font-medium text-brand-700 underline underline-offset-2">create a student account</a>.
      </p>
    </AuthScreen>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
