"use client";

import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useApp } from "@/state/app-provider";
import type { UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/feedback";

export function RoleGuard({
  allow,
  title,
  description,
  children,
}: {
  allow: UserRole[];
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { state, config, setDemoRole } = useApp();

  if (!state.hydrated || state.authLoading) return <LoadingScreen />;
  if (state.user && allow.includes(state.user.role)) return <>{children}</>;

  const desiredRole = allow[0];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-14">
      <Card className="overflow-hidden">
        <div className="bg-navy-950 px-6 py-8 text-white">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <Badge tone="amber" className="mb-3">
            Restricted area
          </Badge>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{description}</p>
        </div>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              {state.user
                ? `You are signed in as ${state.user.role}. Switch to an authorized account to continue.`
                : "Sign in with an authorized account. In demo mode, role changes are local only and never grant access to a real backend."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/login" className="w-full sm:w-auto">
              Go to login
            </ButtonLink>
            {config.demoMode && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setDemoRole(desiredRole)}
              >
                Continue as demo {desiredRole}
              </Button>
            )}
            <ButtonLink href="/" variant="ghost" className="w-full sm:w-auto">
              Back to dashboard
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
