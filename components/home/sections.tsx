import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BellRing,
  BusFront,
  ClipboardList,
  Gauge,
  GraduationCap,
  MapPinned,
  Route as RouteIcon,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { transportOffice } from "@/data/routes";
import { Faq as FaqAccordion } from "@/components/home/faq";
import { HOME_STATS } from "@/components/home/stats";
import { BusIllustration } from "@/components/motion/bus-illustration";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/brand";
import { HOVER_LIFT, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export { HOME_STATS };

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  tone = "canvas",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  children: ReactNode;
  tone?: "canvas" | "surface" | "navy";
}) {
  const palette =
    tone === "navy"
      ? "bg-gradient-navy text-white"
      : tone === "surface"
        ? "border-y border-slate-200 bg-white"
        : "bg-canvas";
  const heading = tone === "navy" ? "text-white" : "text-navy-950";
  const body = tone === "navy" ? "text-white/70" : "text-slate-600";
  const label = tone === "navy" ? "text-brand-200" : "text-brand-700";

  return (
    <section id={id} className={cn("scroll-mt-16", palette)} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal className="max-w-2xl">
          {eyebrow && <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${label}`}>{eyebrow}</p>}
          <h2
            id={id ? `${id}-title` : undefined}
            className={`mt-2 text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl ${heading}`}
          >
            {title}
          </h2>
          {lede && <p className={`mt-3 text-sm leading-6 sm:text-base sm:leading-7 ${body}`}>{lede}</p>}
        </Reveal>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    Icon: RouteIcon,
    title: "Your route, stop by stop",
    body: "Every published pickup point in order, with its scheduled time where the 2025–26 list carries one.",
  },
  {
    Icon: Timer,
    title: "An estimated arrival you can reason with",
    body: "The estimate is calculated for the stop you choose and always says what it is based on.",
  },
  {
    Icon: MapPinned,
    title: "A schematic route line",
    body: "Numbered stops on one blue line. Map geometry is inferred from OpenStreetMap, not a verified bus trace.",
  },
  {
    Icon: BellRing,
    title: "Delay and arrival alerts",
    body: "Route alerts appear in the dashboard once a driver trip is running or an administrator posts one.",
  },
  {
    Icon: BusFront,
    title: "Bus and assignment details",
    body: "Which vehicle serves your route, who is assigned, and whether a trip has started or ended.",
  },
  {
    Icon: ClipboardList,
    title: "Provenance on every screen",
    body: "Simulation, device GPS and last-known GPS are labelled separately, so nothing simulated reads as live.",
  },
];

export function FeatureGrid() {
  return (
    <RevealGroup as="ul" stagger={0.06} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map(({ Icon, title, body }) => (
        <RevealItem
          as="li"
          key={title}
          whileHover={HOVER_LIFT}
          transition={SPRING.gentle}
          className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-shadow duration-300 hover:shadow-lift"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-navy-950">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
          </div>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

const STEPS = [
  {
    step: "1",
    title: "Create a student account",
    body: "Use your college email and password, or continue with Google once the provider is enabled. Accounts start with the student role.",
  },
  {
    step: "2",
    title: "Confirm your email",
    body: "Password accounts need the confirmation link before the first sign-in. Delivery depends on the transport office configuring SMTP.",
  },
  {
    step: "3",
    title: "Pick your route and stop",
    body: "Choose from the published pickup list. The dashboard then estimates arrival for that stop and shows where the estimate comes from.",
  },
];

export function HowItWorks() {
  return (
    <RevealGroup as="ol" stagger={0.1} className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
      {STEPS.map((item, index) => (
        <RevealItem
          as="li"
          key={item.step}
          className="relative rounded-2xl border border-slate-200 bg-gradient-surface p-6 shadow-card"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-white shadow-glow">
              {item.step}
            </span>
            {index < STEPS.length - 1 && (
              <span className="hidden h-px flex-1 bg-gradient-to-r from-brand-200 to-transparent md:block" aria-hidden="true" />
            )}
          </div>
          <h3 className="mt-4 text-base font-semibold text-navy-950">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

const ROLES = [
  {
    Icon: GraduationCap,
    role: "Students",
    body: "Routes, stops, estimated arrival and alerts for the pickup point you actually use.",
    access: "Self-service sign-up",
  },
  {
    Icon: Gauge,
    role: "Drivers",
    body: "Start and end a trip, control location sharing, and see the stops ahead. Device GPS is only accepted for an assigned driver on an active trip.",
    access: "Granted by the transport office",
  },
  {
    Icon: ShieldCheck,
    role: "Transport administrators",
    body: "Maintain routes, stops, buses and assignments, post route alerts, and review trip health.",
    access: "Granted by the transport office",
  },
];

export function RoleCards() {
  return (
    <RevealGroup stagger={0.08} className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {ROLES.map(({ Icon, role, body, access }) => (
        <RevealItem
          as="article"
          key={role}
          whileHover={HOVER_LIFT}
          transition={SPRING.gentle}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow duration-300 hover:shadow-lift"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-navy-950">{role}</h3>
          </div>
          <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{body}</p>
          <p className="mt-5 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
            {access}
          </p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

const HONESTY = [
  {
    label: "Estimated",
    body: "Arrival times are calculated from the published 2025–26 pickup list and a modelled journey. They are an estimate, not a timetable promise.",
  },
  {
    label: "Simulated",
    body: "Until an authorized driver shares device GPS, vehicle positions are simulated. Simulation is labelled on the map, the header and the bus details.",
  },
  {
    label: "Inferred geometry",
    body: "Route lines are drawn between published stops, optionally shaped by OpenStreetMap roads. They are not a verified bus trace.",
  },
  {
    label: "Needs confirming",
    body: `${HOME_STATS.unlocated} of ${HOME_STATS.stops} stops have no reliable coordinates yet, and the pickup times still need confirmation from the transport office.`,
  },
];

export function DataHonestyPanel() {
  return (
    <RevealGroup stagger={0.08} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {HONESTY.map((item) => (
        <RevealItem
          key={item.label}
          className="rounded-2xl bg-white/[0.06] p-6 ring-1 ring-inset ring-white/10 backdrop-blur-sm transition-colors duration-300 hover:bg-white/[0.09]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-200">{item.label}</p>
          <p className="mt-2 text-sm leading-6 text-white/75">{item.body}</p>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

const QUESTIONS = [
  {
    q: "Is BusTrack tracking buses live right now?",
    a: "No. Live positions need an authorized, assigned driver sharing device GPS from a real vehicle. Until then, movement is simulated and clearly labelled, and arrival times are estimates from the published pickup list.",
  },
  {
    q: "Who can open the dashboard?",
    a: "Only signed-in accounts. The public site shows this introduction and nothing else — routes, stops, estimates and alerts sit behind sign-in.",
  },
  {
    q: "Can I sign up myself?",
    a: "Yes. Student sign-up is open with email and password, or with Google once the transport administrator enables the Google provider in Supabase Auth. New accounts always start as students.",
  },
  {
    q: "How do driver and administrator roles work?",
    a: "They are granted by the transport office on your profile. Signing up never creates a privileged role, and the API re-checks the role on every request.",
  },
  {
    q: "Where does the route data come from?",
    a: `The published ${HOME_STATS.scheduleYear} pickup list for Lords Institute of Engineering and Technology, Hyderabad: ${HOME_STATS.routes} routes and ${HOME_STATS.stops} stops, of which ${HOME_STATS.timed} carry a scheduled time. Contains data provided by TGSRTC, with stop locations referenced from OpenStreetMap.`,
  },
  {
    q: "What if my confirmation email never arrives?",
    a: "Supabase's default sender is limited to a few messages per hour and to organisation addresses. Ordinary student sign-up needs custom SMTP; the setup steps are documented for the administrator.",
  },
];

export function Faq() {
  return <FaqAccordion items={QUESTIONS} />;
}

export function CtaBand() {
  return (
    <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-navy px-6 py-10 text-white shadow-float sm:px-10 sm:py-14">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 text-center lg:text-left">
          <h2 className="text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            Stop guessing at the gate
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7 lg:mx-0">
            Create a student account, choose your pickup point, and keep an estimated arrival with you on
            the way to college.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row lg:justify-start">
            <ButtonLink href="/signup" size="lg" className="group bg-white text-navy-950 shadow-none hover:bg-brand-50">
              Create a student account
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
            >
              I already have an account
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs leading-5 text-white/55">
            Free for students. Email confirmation is required, so use an address you can open.
          </p>
        </div>
        <div className="mx-auto w-full max-w-xs lg:max-w-sm">
          <BusIllustration className="drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]" />
        </div>
      </div>
    </Reveal>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="min-w-0">
          <Logo href={null} />
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-500">
            A route and estimated-arrival tool for college bus commuters in Hyderabad. Not an
            official live tracking service, and not affiliated with TGSRTC.
          </p>
        </div>

        <nav aria-label="Footer" className="min-w-0">
          <h2 className="text-xs font-semibold text-navy-950">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/#what-you-get" className="transition-colors hover:text-navy-950">What you get</Link></li>
            <li><Link href="/#how-it-works" className="transition-colors hover:text-navy-950">How it works</Link></li>
            <li><Link href="/#data-honesty" className="transition-colors hover:text-navy-950">Data honesty</Link></li>
            <li><Link href="/signup" className="transition-colors hover:text-navy-950">Create an account</Link></li>
          </ul>
        </nav>

        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-navy-950">Transport office</h2>
          <ul className="mt-3 space-y-2 text-sm break-words text-slate-600">
            <li>{transportOffice.name}</li>
            <li className="text-slate-500">
              {transportOffice.email}
              <span className="ml-1 text-xs text-slate-400">(placeholder)</span>
            </li>
            <li>
              <span className="text-slate-500">{transportOffice.phone}</span>
            </li>
            <li className="text-xs text-slate-500">{transportOffice.hours}</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Contact details are placeholders until the transport office confirms them.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            Contains data provided by TGSRTC. Stop locations referenced from{" "}
            <Link href="https://www.openstreetmap.org/copyright" className="underline underline-offset-2 hover:text-navy-900">
              OpenStreetMap
            </Link>{" "}
            contributors.
          </span>
          <span>{HOME_STATS.scheduleYear} pickup list · {HOME_STATS.routes} routes · {HOME_STATS.stops} stops</span>
        </div>
      </div>
    </footer>
  );
}
