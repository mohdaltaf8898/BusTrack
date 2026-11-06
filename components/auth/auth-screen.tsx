import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand";
import { BusIllustration } from "@/components/motion/bus-illustration";

/**
 * Shared chrome for the public account screens. They sit outside the workspace
 * shell, so each one carries its own brand row and a way back to the
 * introduction page.
 */
export function AuthScreen({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <Link
            href="/"
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Introduction
          </Link>
        </div>
      </header>

      <main id="main-content" className="relative flex-1 overflow-hidden">
        {/* Soft brand colour behind the frosted card; decorative only. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-hero" aria-hidden="true" />
        <div className="glow-blob -right-24 top-6 h-72 w-72 bg-brand-200/60" aria-hidden="true" />
        <div className="glow-blob -left-20 bottom-0 h-64 w-64 bg-navy-200/50" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          {/* CSS entrances: these screens are server-rendered and must paint before hydration. */}
          <div className="order-2 animate-rise motion-reduce:animate-none lg:order-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-navy-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              {description}
            </p>
            {aside && <div className="mt-6 max-w-xl">{aside}</div>}
            <div className="mt-10 hidden max-w-xl overflow-hidden rounded-3xl border border-brand-100 bg-gradient-hero p-6 lg:block">
              <BusIllustration className="mx-auto max-w-sm" />
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Estimated times are labelled as estimates. Live positions appear only when an authorized driver device shares them.
              </p>
            </div>
          </div>
          <div className="order-1 w-full animate-rise motion-reduce:animate-none lg:order-2" style={{ animationDelay: "0.08s" }}>
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <span>BusTrack · Lords Institute of Engineering and Technology, Hyderabad</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>
            Arrival times are estimates from published pickup times. Live positions need an
            authorized driver device.
          </span>
        </div>
      </footer>
    </div>
  );
}
