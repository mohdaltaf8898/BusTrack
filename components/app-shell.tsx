"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BusFront,
  ChevronRight,
  Gauge,
  GraduationCap,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Route as RouteIcon,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/state/app-provider";
import { SourceLabel } from "@/components/ui/labels";
import { Logo } from "@/components/brand";
import { PageTransition } from "@/components/motion/page-transition";
import { RouteSelector } from "@/components/route-selector";
import { Alert, LoadingScreen, OfflineNotice } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/sheet";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "startsWith";
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/track", label: "Track bus", icon: MapPinned },
  { href: "/routes", label: "Routes & Stops", icon: RouteIcon },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/bus-details", label: "Bus Details", icon: BusFront },
];

const workspaceNav: NavItem[] = [
  { href: "/driver", label: "Driver Dashboard", icon: Gauge },
  { href: "/admin", label: "Admin Dashboard", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const titles: Record<string, string> = {
  "/dashboard": "Student Dashboard",
  "/track": "Bus tracking",
  "/routes": "Routes & Stops",
  "/notifications": "Notifications",
  "/bus-details": "Bus Details",
  "/driver": "Driver Dashboard",
  "/admin": "Admin Dashboard",
  "/profile": "Profile",
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
        "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        active ? "text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-navy-950",
        compact && "min-h-12",
      )}
    >
      {active && (
        <m.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-brand-50"
          transition={SPRING.gentle}
          aria-hidden="true"
        />
      )}
      <Icon className="relative h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
      <span className="relative truncate">{item.label}</span>
    </Link>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-slate-200 bg-white md:flex">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-xs font-medium text-slate-600">
          Student
        </p>
        <nav className="space-y-1" aria-label="Student navigation">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <p className="px-3 pb-2 pt-6 text-xs font-medium text-slate-600">
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
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/track", label: "Track", icon: MapPinned },
    { href: "/routes", label: "Routes", icon: RouteIcon },
    { href: "/notifications", label: "Alerts", icon: Bell, badge: unreadCount },
  ];
  return (
    <nav
      aria-label="Mobile primary navigation"
      className="glass-strong safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 px-1 pt-1.5 md:hidden"
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
                "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                active ? "text-brand-700" : "text-slate-600 active:bg-slate-50",
              )}
            >
              {active && (
                <m.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 top-0.5 h-9 rounded-xl bg-brand-50"
                  transition={SPRING.gentle}
                  aria-hidden="true"
                />
              )}
              <m.span
                className="relative"
                animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                transition={SPRING.gentle}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <AnimatePresence>
                  {!!item.badge && item.badge > 0 && (
                    <m.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </m.span>
                  )}
                </AnimatePresence>
              </m.span>
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
        <m.button
          type="button"
          onClick={onMore}
          whileTap={{ scale: 0.92 }}
          aria-label="Open more navigation"
          className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold text-slate-600 active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          More
        </m.button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const { state, signOut } = useApp();
  const items = [{ href: "/bus-details", label: "Bus Details", icon: BusFront }, ...workspaceNav];
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="More"
      description="BusTrack workspace"
      closeLabel="Close navigation"
      layerClassName="z-[70] md:hidden"
    >
      <m.div
        className="grid gap-1.5"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } } }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <m.div key={item.href} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors active:bg-brand-50",
                  active ? "bg-brand-50 text-brand-700" : "text-navy-800 hover:bg-slate-50",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300" aria-hidden="true" />
              </Link>
            </m.div>
          );
        })}
      </m.div>
      {state.user && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => {
            void signOut().then(() => window.location.assign("/"));
            onClose();
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </Button>
      )}
    </BottomSheet>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { state, snapshot, unreadCount, clearError } = useApp();
  const pageTitle = titles[pathname] ?? "BusTrack";

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar pathname={pathname} />
      <div className="md:pl-[240px]">
        {!state.isOnline && <OfflineNotice />}
        <header className="glass-strong sticky top-0 z-40 border-b border-slate-200/70">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-3 sm:px-5">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="text-xs font-medium text-slate-500">
                BusTrack
              </p>
              <h1 className="truncate text-sm font-semibold text-navy-950">{pageTitle}</h1>
            </div>
            <div className={cn("hidden w-64 xl:block", pathname === "/dashboard" && "xl:hidden")}>
              <RouteSelector showLabel={false} compact />
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <SourceLabel mode={snapshot.dataMode} />
              <Link
                href="/notifications"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <m.span
                      key="unread"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
                    />
                  )}
                </AnimatePresence>
              </Link>
              <Link
                href={state.user ? "/profile" : "/login"}
                aria-label={state.user ? "Open profile" : "Sign in"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-navy-950 text-xs font-semibold text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {state.user?.avatarInitials ?? <UserRound className="h-5 w-5" aria-hidden="true" />}
              </Link>
            </div>
          </div>
        </header>
        {state.error && (
          <div className="mx-auto max-w-[1200px] px-4 pt-3 sm:px-6">
            <Alert tone="error" title="Something needs attention" onDismiss={clearError}>
              {state.error}
            </Alert>
          </div>
        )}
        <main id="main-content" className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-16">
          {state.hydrated ? <PageTransition>{children}</PageTransition> : <LoadingScreen />}
        </main>
      </div>
      <BottomNav pathname={pathname} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} pathname={pathname} />
    </div>
  );
}
