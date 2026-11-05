"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { useApp } from "@/state/app-provider";
import { cn } from "@/lib/utils";

export const HOME_NAV = [
  { href: "/#what-you-get", label: "What you get" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#who-uses-it", label: "Who uses it" },
  { href: "/#data-honesty", label: "Data honesty" },
  { href: "/#questions", label: "Questions" },
];

/**
 * Public site header. It stays out of the workspace shell, shows only an
 * introduction-level navigation, and swaps its call to action once a session
 * exists.
 */
export function SiteHeader() {
  const { state } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Introduction sections" className="ml-6 hidden items-center gap-1 lg:flex">
          {HOME_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {state.user ? (
            <ButtonLink href="/dashboard">Open dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-navy-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:ml-2 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        id="site-menu"
        hidden={!open}
        className={cn("border-t border-slate-200 bg-white lg:hidden", !open && "hidden")}
      >
        <nav aria-label="Introduction sections (mobile)" className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
          <ul className="grid gap-1">
            {HOME_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-12 items-center rounded-xl px-3 text-sm font-medium text-navy-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
            {state.user ? (
              <ButtonLink href="/dashboard" className="w-full">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/signup" className="w-full">
                  Create account
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" className="w-full">
                  Sign in
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
