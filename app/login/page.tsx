"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Gauge,
  UserRound,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { AuthCard } from "@/components/auth/auth-card";
import { DemoModeBadge } from "@/components/ui/labels";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const demoRoles: Array<{
  role: UserRole;
  title: string;
  description: string;
  href: string;
  Icon: typeof UserRound;
  tone: string;
}> = [
  {
    role: "student",
    title: "Student",
    description: "Track buses, ETAs, stops and alerts.",
    href: "/",
    Icon: GraduationCap,
    tone: "bg-brand-50 text-brand-700",
  },
  {
    role: "driver",
    title: "Driver",
    description: "Start a trip and control location sharing.",
    href: "/driver",
    Icon: Gauge,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    role: "admin",
    title: "Administrator",
    description: "Manage buses, routes, stops and assignments.",
    href: "/admin",
    Icon: ShieldCheck,
    tone: "bg-violet-50 text-violet-700",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { state, config, signOut, setDemoRole } = useApp();
  const [notice, setNotice] = useState<string | null>(null);

  const chooseDemoRole = (role: UserRole, href: string) => {
    setDemoRole(role);
    setNotice(`Switched to the local demo ${role} role.`);
    router.push(href);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Login & role access"
        description="Sign in when authentication is configured, or choose a local demo role."
        actions={config.demoMode ? <DemoModeBadge /> : <Badge tone="green" dot>Supabase Auth</Badge>}
      />

      {state.user && (
        <Alert tone="success" onDismiss={() => setNotice(null)}>
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Signed in as <strong>{state.user.name}</strong> · {state.user.role} · {state.user.provider}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              className="ml-auto"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </Alert>
      )}
      {notice && (
        <Alert tone="info" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AuthCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Local demo roles
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Role switching is stored only in this browser and never grants access to a real Supabase project.
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {demoRoles.map((item) => {
              const Icon = item.Icon;
              const active = state.user?.role === item.role && state.user?.provider === "demo";
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => chooseDemoRole(item.role, item.href)}
                  className={cn(
                    "flex min-h-[74px] w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                    active
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.tone)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-extrabold text-navy-950">
                      {item.title}
                      {active && <Badge tone="blue">Current</Badge>}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </button>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-2">
              <ButtonLink href="/profile" variant="outline" size="sm">
                View profile
              </ButtonLink>
              <ButtonLink href="/" variant="ghost" size="sm">
                Continue as guest
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
