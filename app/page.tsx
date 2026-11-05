import type { Metadata } from "next";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { SiteHeader } from "@/components/home/site-header";
import { RouteSchematic } from "@/components/home/route-schematic";
import {
  CtaBand,
  DataHonestyPanel,
  Faq,
  FeatureGrid,
  HOME_STATS,
  HowItWorks,
  RoleCards,
  Section,
  SiteFooter,
} from "@/components/home/sections";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "BusTrack · Find your college bus route and an estimated arrival",
  description:
    "BusTrack is a sign-in-only tool for Lords Institute of Engineering and Technology students in Hyderabad: find your pickup route, see the numbered stop list, and get an estimated arrival time. Live positions need an authorized driver device.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "BusTrack · Know before you go",
    description:
      "Find your college bus route and an estimated arrival time. Routes, stops and alerts sit behind sign-in.",
    type: "website",
    url: "/",
    siteName: "BusTrack",
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
            <div className="animate-fade-in">
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-surface-muted px-3 py-1.5 text-xs font-medium text-slate-600">
                <LockKeyhole className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                Sign-in only · Lords Institute of Engineering and Technology, Hyderabad
              </p>

              <h1 className="mt-5 max-w-2xl text-[clamp(2.25rem,5.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-navy-950">
                Know which bus is coming,{" "}
                <span className="text-brand-600">and roughly when</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                BusTrack puts the published {HOME_STATS.scheduleYear} pickup list in your pocket:{" "}
                {HOME_STATS.routes} routes, {HOME_STATS.stops} stops, your boarding point, and an
                arrival estimate that always says what it is based on. Nothing here pretends to be
                live vehicle tracking.
              </p>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Create a student account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" size="lg">
                  Sign in
                </ButtonLink>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                {[
                  { term: "Published routes", value: String(HOME_STATS.routes) },
                  { term: "Pickup stops", value: String(HOME_STATS.stops) },
                  { term: "Stops with a time", value: String(HOME_STATS.timed) },
                ].map((stat) => (
                  <div key={stat.term}>
                    <dt className="text-xs text-slate-500">{stat.term}</dt>
                    <dd className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-navy-950">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <RouteSchematic className="animate-fade-in" />
          </div>
        </section>

        <Section
          id="what-you-get"
          tone="canvas"
          eyebrow="After you sign in"
          title="What you get"
          lede="The public site stops here. These are the screens a signed-in student sees, built to answer one question quickly: should I leave now?"
        >
          <FeatureGrid />
        </Section>

        <Section
          id="how-it-works"
          tone="surface"
          eyebrow="Three steps"
          title="How it works"
          lede="Account creation is open to students. Driver and administrator access is granted by the transport office on your profile."
        >
          <HowItWorks />
        </Section>

        <Section
          id="who-uses-it"
          tone="canvas"
          eyebrow="Three roles"
          title="Who uses it"
          lede="One dataset, three points of view. Roles come from your BusTrack profile and are re-checked by the API on every privileged request."
        >
          <RoleCards />
        </Section>

        <Section
          id="data-honesty"
          tone="navy"
          eyebrow="Read this before you rely on it"
          title="What is estimated, and what would be live"
          lede="BusTrack is a wayfinding and estimation tool. It does not currently receive GPS from college buses, and it will not claim otherwise."
        >
          <DataHonestyPanel />
        </Section>

        <Section
          id="questions"
          tone="surface"
          eyebrow="Questions"
          title="Things students ask"
          lede={undefined}
        >
          <Faq />
        </Section>

        <Section tone="canvas" title="Ready when you are" lede={undefined}>
          <CtaBand />
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
