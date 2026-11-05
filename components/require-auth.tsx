"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LockKeyhole, ServerCog } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { Logo } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/feedback";
import { sanitizeInternalPath } from "@/lib/auth-flow";

/** Paths that stay reachable without an account. */
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/set-password", "/auth/callback"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function loginTarget(pathname: string) {
  const next = sanitizeInternalPath(pathname, "/dashboard");
  return next === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}

/**
 * Every signed-in workspace route renders through this gate. The Supabase
 * session lives in the browser, so this is a navigation gate: it keeps the
 * workspace UI out of sight and redirects to sign-in. Actual access to bus,
 * route and location data is enforced by Postgres row-level security and by the
 * API routes, which require a valid access token and an authorized profile.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, config } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const signedOut = state.hydrated && !state.authLoading && !state.user;

  useEffect(() => {
    if (signedOut && !config.unconfigured) router.replace(loginTarget(pathname));
  }, [signedOut, config.unconfigured, pathname, router]);

  if (!state.hydrated || state.authLoading) return <LoadingScreen />;

  if (state.user) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <Logo />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {config.unconfigured ? (
                <ServerCog className="h-4 w-4 text-navy-700" aria-hidden="true" />
              ) : (
                <LockKeyhole className="h-4 w-4 text-navy-700" aria-hidden="true" />
              )}
              {config.unconfigured ? "BusTrack is not connected to a backend" : "Sign in to continue"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
            {config.unconfigured ? (
              <>
                <p>
                  This deployment has no Supabase credentials, so there is no account to sign in
                  with. BusTrack has no offline demo mode.
                </p>
                <p>
                  Add <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                  and the server-only{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>,
                  apply the migrations, then restart.
                </p>
                <ButtonLink href="/" variant="outline" className="w-full">
                  Back to the introduction
                </ButtonLink>
              </>
            ) : (
              <>
                <p>
                  Bus routes, stops, arrival estimates and alerts are only visible to signed-in
                  students, drivers and transport administrators.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <ButtonLink href={loginTarget(pathname)} className="w-full sm:w-auto">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/signup" variant="outline" className="w-full sm:w-auto">
                    Create a student account
                  </ButtonLink>
                </div>
                <p className="text-xs text-slate-500">
                  New here? Read the <Link href="/#how-it-works" className="font-medium text-brand-700 underline underline-offset-2">introduction</Link>{" "}
                  first — it explains what is estimated and what needs a driver device.
                </p>
              </>
            )}
            {config.unconfigured && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => router.refresh()}>
                Retry after configuring
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
