import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { SiteHeader } from "@/components/home/site-header";
import {
  CtaBand,
  DataHonestyPanel,
  Faq,
  FeatureGrid,
  HowItWorks,
  RoleCards,
  Section,
  SiteFooter,
} from "@/components/home/sections";

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
        <Hero />

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

        <section aria-label="Create an account" className="bg-canvas">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <CtaBand />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
