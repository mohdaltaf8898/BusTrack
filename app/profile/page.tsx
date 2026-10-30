"use client";

import { useState } from "react";
import {
  BellRing,
  Download,
  GraduationCap,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { APP_STORAGE_KEY } from "@/lib/app-reducer";
import { useApp } from "@/state/app-provider";
import { PageHeader } from "@/components/page-header";
import { RouteSelector } from "@/components/route-selector";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { DemoModeBadge } from "@/components/ui/labels";

export default function ProfilePage() {
  const {
    state,
    config,
    snapshot,
    unreadCount,
    pushPermission,
    requestPushPermission,
    signOut,
  } = useApp();
  const [resetOpen, setResetOpen] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  if (!state.user) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader eyebrow="Profile" title="You are browsing as a guest" />
        <EmptyState
          icon={<UserRound className="h-6 w-6" />}
          title="Sign in to personalize BusTrack"
          description="Choose a demo role or sign in with Supabase Auth to see account details and role-based tools."
          action={<ButtonLink href="/login">Go to login</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        eyebrow="Profile"
        title="Your BusTrack profile"
        description="Account role, route preference, notification settings and local demo controls."
        actions={<DemoModeBadge />}
      />

      <Card className="overflow-hidden">
        <div className="bg-navy-950 p-5 text-white sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-2xl font-extrabold text-brand-200">
              {state.user.avatarInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Signed in as</p>
              <h2 className="truncate text-2xl font-extrabold">{state.user.name}</h2>
              <p className="truncate text-sm text-white/65">{state.user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">{state.user.role}</Badge>
              <Badge tone="navy" className="bg-white/10 text-white ring-white/10">
                {state.user.provider}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Institution</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-navy-950">
              <GraduationCap className="h-4 w-4 text-brand-600" aria-hidden="true" />
              LIET Hyderabad
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Selected route</p>
            <p className="mt-1 text-sm font-bold text-navy-950">
              {snapshot.route.code} · {snapshot.route.busNumber}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Unread alerts</p>
            <p className="mt-1 text-sm font-bold text-navy-950">{unreadCount}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RouteSelector />
              <div className="rounded-2xl border border-slate-100 p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-navy-950">Browser notifications</p>
                      <p className="text-xs text-slate-500">
                        Permission: {pushPermission}. Optional while the app is open.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pushPermission === "granted" || pushPermission === "unsupported"}
                    onClick={async () => {
                      try {
                        setPushError(null);
                        await requestPushPermission();
                      } catch (error) {
                        setPushError(error instanceof Error ? error.message : "Permission request failed.");
                      }
                    }}
                  >
                    {pushPermission === "granted" ? "Enabled" : "Enable"}
                  </Button>
                </div>
                {pushError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600" role="alert">
                    {pushError}
                  </p>
                )}
              </div>
              <Alert tone="info">
                SMS and WhatsApp notifications are not configured. Only in-app and optional browser alerts are available.
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Install on a phone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                A web app manifest and icon are included. On Chrome, use <strong>Add to Home Screen</strong>;
                on Safari, use <strong>Share → Add to Home Screen</strong>.
              </p>
              <p className="text-xs leading-5">
                Installation requires HTTPS (or localhost). Offline page caching is not currently enabled.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="blue">
                  <Download className="h-3 w-3" /> Manifest ready
                </Badge>
                <Badge tone="neutral">No service worker</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Access & privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                <span>Role</span>
                <Badge tone="blue">{state.user.role}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                <span>Backend</span>
                <Badge tone={config.publicConfigured ? "green" : "amber"}>
                  {config.publicConfigured ? "Supabase client" : "Local demo"}
                </Badge>
              </div>
              <p className="text-xs leading-5">
                In demo mode, roles and data are local to this browser. In real mode, server API routes verify the
                Supabase access token and profile role before any privileged operation. Driver GPS is never accepted
                from a student account or while a trip is inactive.
              </p>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/login" variant="outline" size="sm">
                  Switch role
                </ButtonLink>
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Local demo data</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Restore the historical route catalogue, notifications and simulation progress to their original state.
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                <RefreshCw className="h-4 w-4" /> Reset local demo state
              </Button>
              <p className="mt-2 text-xs text-slate-500">
                This clears <code>{APP_STORAGE_KEY}</code> from this browser and reloads the page. It does not modify
                Supabase data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          try {
            window.localStorage.removeItem(APP_STORAGE_KEY);
          } finally {
            window.location.reload();
          }
        }}
        title="Reset local demo state?"
        description="Local route edits, notifications and simulation progress will be replaced with the original catalogue."
        confirmLabel="Reset and reload"
      />
    </div>
  );
}
