"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
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
import { Input, Label } from "@/components/ui/form";
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
  const { state, config, signIn, signOut, setDemoRole } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      setNotice("Signed in. Your role is read from your Supabase profile.");
      setPassword("");
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

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
        description="Use Supabase Auth when configured, or choose a clearly labelled local demo role for the prototype."
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
      {error && (
        <Alert tone="error" title="Sign-in error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && !error && (
        <Alert tone="info" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Supabase sign in
              </CardTitle>
              <Badge tone={config.publicConfigured ? "green" : "neutral"}>
                {config.publicConfigured ? "Configured" : "Not configured"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Only public URL and anon key are used in the browser. Privileged keys stay on the server.
            </p>
          </CardHeader>
          <CardContent>
            {config.publicConfigured ? (
              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="driver@example.edu"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Your Supabase password"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" loading={loading || state.authLoading}>
                  Sign in
                </Button>
                <p className="text-center text-[11px] leading-5 text-slate-500">
                  Create users in Supabase Auth and seed matching rows in <code>public.profiles</code>. Driver and
                  admin capabilities are verified again by server API routes.
                </p>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert tone="info" title="Credential-free mode">
                  No Supabase public credentials were found. The form is disabled; all screens below work with local
                  sample data.
                </Alert>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <p className="font-bold text-navy-950">To enable real authentication:</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
                    <li>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</li>
                    <li>Set server-only <code>SUPABASE_SERVICE_ROLE_KEY</code> for API authorization.</li>
                    <li>Apply the migration and seed profiles, routes, buses and stops.</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
