"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BusFront,
  ChevronRight,
  Gauge,
  GraduationCap,
  Home,
  LogIn,
  MapPinned,
  Menu,
  Route as RouteIcon,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { DemoModeBadge } from "@/components/ui/labels";
import { Logo } from "@/components/brand";
import { RouteSelector } from "@/components/route-selector";
import { Alert, LoadingScreen, OfflineNotice } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "startsWith";
}

const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home, match: "exact" },
  { href: "/track", label: "Live Tracking", icon: MapPinned },
  { href: "/routes", label: "Routes & Stops", icon: RouteIcon },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/bus-details", label: "Bus Details", icon: BusFront },
];

const workspaceNav: NavItem[] = [
  { href: "/driver", label: "Driver Dashboard", icon: Gauge },
  { href: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/login", label: "Login / Switch role", icon: LogIn },
];

const titles: Record<string, string> = {
  "/": "Student Dashboard",
  "/track": "Live Bus Tracking",
  "/routes": "Routes & Stops",
  "/notifications": "Notifications",
  "/bus-details": "Bus Details",
  "/driver": "Driver Dashboard",
  "/admin": "Admin Dashboard",
  "/profile": "Profile",
  "/login": "Login",
  "/auth/set-password": "Set password",
};

function isActive(pathname: string, item: NavItem) {
  return item.match === "exact"
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  pathname,
  onClick,
  compact = false,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
          : "text-navy-600 hover:bg-brand-50 hover:text-brand-700",
        compact && "min-h-12",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
    </Link>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl md:flex">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
          Student
        </p>
        <nav className="space-y-1" aria-label="Student navigation">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <p className="px-3 pb-2 pt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        <nav className="space-y-1" aria-label="Workspace navigation">
          {workspaceNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          <span>LIET Hyderabad · Transport</span>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({
  pathname,
  onMore,
}: {
  pathname: string;
  onMore: () => void;
}) {
  const { unreadCount } = useApp();
  const items: Array<NavItem & { badge?: number }> = [
    { href: "/", label: "Home", icon: Home, match: "exact" },
    { href: "/track", label: "Live", icon: MapPinned },
    { href: "/routes", label: "Routes", icon: RouteIcon },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
  ];
  return (
    <nav
      aria-label="Mobile primary navigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-1 pt-1.5 shadow-[0_-8px_30px_rgba(10,24,44,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold transition",
                active ? "text-brand-700" : "text-slate-500",
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", active && "fill-brand-50")} aria-hidden="true" />
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="Open more navigation"
          className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold text-slate-500"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const { state, signOut } = useApp();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px]"
      />
      <div className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-6 shadow-float animate-fade-in">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-extrabold text-navy-950">More</p>
            <p className="text-xs text-slate-500">BusTrack workspace</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid gap-1.5">
          {[{ href: "/bus-details", label: "Bus Details", icon: BusFront }, ...workspaceNav].map(
            (item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                    active ? "bg-brand-50 text-brand-700" : "text-navy-800 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-300" aria-hidden="true" />
                </Link>
              );
            },
          )}
        </div>
        {state.user && (
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              void signOut();
              onClose();
            }}
          >
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { state, unreadCount, clearError } = useApp();
  const pageTitle = titles[pathname] ?? "BusTrack";

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar pathname={pathname} />
      <div className="md:pl-[264px]">
        {!state.isOnline && <OfflineNotice />}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-5">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-600">
                BusTrack
              </p>
              <h1 className="truncate text-sm font-extrabold text-navy-950">{pageTitle}</h1>
            </div>
            <div className="hidden w-64 xl:block">
              <RouteSelector showLabel={false} compact />
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <DemoModeBadge compact />
              <Link
                href="/notifications"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </Link>
              <Link
                href={state.user ? "/profile" : "/login"}
                aria-label={state.user ? "Open profile" : "Sign in"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 text-xs font-extrabold text-white transition hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {state.user?.avatarInitials ?? <UserRound className="h-5 w-5" aria-hidden="true" />}
              </Link>
            </div>
          </div>
        </header>
        {state.error && (
          <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-5">
            <Alert tone="error" title="Something needs attention" onDismiss={clearError}>
              {state.error}
            </Alert>
          </div>
        )}
        <main id="main-content" className="mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-5 sm:pt-6 md:pb-10">
          {state.hydrated ? children : <LoadingScreen />}
        </main>
      </div>
      <BottomNav pathname={pathname} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} pathname={pathname} />
    </div>
  );
}
