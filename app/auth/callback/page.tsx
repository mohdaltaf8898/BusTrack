"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sanitizeInternalPath } from "@/lib/auth-flow";
import { useApp } from "@/state/app-provider";

/** Read-only description of why Supabase sent the browser back with an error. */
function oauthFailure(search: URLSearchParams) {
  const code = search.get("error_code") ?? search.get("error");
  const description = search.get("error_description");
  if (!code && !description) return null;
  if (code === "access_denied" || /denied|cancelled|canceled/i.test(description ?? "")) {
    return "Google sign-in was cancelled. Nothing was shared with BusTrack.";
  }
  if (/redirect|not.*allow|origin/i.test(description ?? "")) {
    return "This address is not in the Supabase redirect allow-list, so the OAuth callback was rejected.";
  }
  if (/server_error|temporarily/i.test(description ?? "")) {
    return "The sign-in provider reported a temporary error. Please try again.";
  }
  return description || "The sign-in provider returned an error.";
}

function CallbackState() {
  const router = useRouter();
  const params = useSearchParams();
  const { state } = useApp();
  const [timedOut, setTimedOut] = useState(false);
  const next = sanitizeInternalPath(params.get("next"), "/dashboard");
  const failure = oauthFailure(new URLSearchParams(window.location.search));

  useEffect(() => {
    if (failure || state.user) return;
    const timer = window.setTimeout(() => setTimedOut(true), 20_000);
    return () => window.clearTimeout(timer);
  }, [failure, state.user]);

  useEffect(() => {
    if (!failure && state.user) router.replace(next);
  }, [failure, state.user, next, router]);

  const pending = !failure && !timedOut && !state.user;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md space-y-5">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            {pending ? (
              <>
                <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
                <p className="text-base font-semibold text-navy-950">Finishing your Google sign-in</p>
                <p className="text-sm leading-6 text-slate-600">
                  Exchanging the provider response for your BusTrack session. This page closes
                  itself.
                </p>
              </>
            ) : (
              <>
                <TriangleAlert className="mx-auto h-6 w-6 text-amber-600" aria-hidden="true" />
                <p className="text-base font-semibold text-navy-950">Sign-in did not complete</p>
                <p className="text-sm leading-6 text-slate-600">
                  {failure ?? "The session did not arrive in time. Your Google account was not linked."}
                </p>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
                  <ButtonLink href="/login" className="w-full sm:w-auto">
                    Back to sign in
                  </ButtonLink>
                  <ButtonLink href="/" variant="outline" className="w-full sm:w-auto">
                    Introduction
                  </ButtonLink>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Administrators: check that{" "}
                  <Link href="/auth/callback" className="font-medium text-brand-700 underline underline-offset-2">
                    /auth/callback
                  </Link>{" "}
                  is in the Supabase redirect allow-list and that the Google provider has a client
                  ID and secret (<code>docs/AUTH.md</code>).
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackState />
    </Suspense>
  );
}
