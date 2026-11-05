"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { useApp } from "@/state/app-provider";
import { DURATION, EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const HOME_NAV = [
  { href: "/#what-you-get", label: "What you get" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#who-uses-it", label: "Who uses it" },
  { href: "/#data-honesty", label: "Data honesty" },
  { href: "/#questions", label: "Questions" },
];

const menuItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

/**
 * Public site header. It stays out of the workspace shell, shows only an
 * introduction-level navigation, and swaps its call to action once a session
 * exists. The mobile menu slides open with its items staggered; the bar picks
 * up a hairline shadow once the page has scrolled.
 */
export function SiteHeader() {
  const { state } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 8));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-white/90 backdrop-blur transition-[box-shadow,border-color] duration-300 supports-[backdrop-filter]:bg-white/80",
        scrolled || open ? "border-slate-200 shadow-card" : "border-transparent",
      )}
    >
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

        <m.button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          whileTap={{ scale: 0.92 }}
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-navy-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:ml-2 lg:hidden"
        >
          <m.span
            key={open ? "close" : "open"}
            initial={{ rotate: open ? -90 : 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="flex"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </m.span>
        </m.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id="site-menu"
            key="site-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: { duration: DURATION.base, ease: EASE_OUT }, opacity: { duration: 0.2 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.22, ease: EASE_IN_OUT }, opacity: { duration: 0.14 } } }}
            className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
          >
            <m.nav
              aria-label="Introduction sections (mobile)"
              className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}
            >
              <ul className="grid gap-1">
                {HOME_NAV.map((item) => (
                  <m.li key={item.href} variants={menuItemVariants}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center rounded-xl px-3 text-sm font-medium text-navy-800 transition-colors hover:bg-slate-50 active:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {item.label}
                    </Link>
                  </m.li>
                ))}
              </ul>
              <m.div variants={menuItemVariants} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
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
              </m.div>
            </m.nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
