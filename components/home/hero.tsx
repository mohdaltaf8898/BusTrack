import { ArrowRight, LockKeyhole } from "lucide-react";
import type { CSSProperties } from "react";
import { CountUp } from "@/components/motion/count-up";
import { BusIllustration } from "@/components/motion/bus-illustration";
import { RouteSchematic } from "@/components/home/route-schematic";
import { HOME_STATS } from "@/components/home/stats";
import { ButtonLink } from "@/components/ui/button";

const HEADLINE = "Know which bus is coming,";
const HEADLINE_ACCENT = "and roughly when";

/** Seconds between successive hero blocks. */
const BLOCK_STAGGER = 0.09;
/** Seconds between successive headline words. */
const WORD_STAGGER = 0.045;

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds.toFixed(3)}s` });

/**
 * Headline words rise into view one after another. This entrance is pure CSS
 * (see `animate-word-rise`) rather than a Motion variant on purpose: the
 * headline is the page's largest contentful paint and must become visible
 * before hydration, which an inline `opacity: 0` initial state would prevent.
 * Reduced motion collapses the keyframes to their final frame.
 */
function Words({ text, className, offset = 0 }: { text: string; className?: string; offset?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span
            className={`inline-block animate-word-rise motion-reduce:animate-none ${className ?? ""}`}
            style={delay(BLOCK_STAGGER + (offset + index) * WORD_STAGGER)}
          >
            {word}
          </span>
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

const STATS = [
  { term: "Published routes", value: HOME_STATS.routes },
  { term: "Pickup stops", value: HOME_STATS.stops },
  { term: "Stops with a time", value: HOME_STATS.timed },
];

const headlineWordCount = HEADLINE.split(" ").length;
const accentWordCount = HEADLINE_ACCENT.split(" ").length;
const afterHeadline = BLOCK_STAGGER + (headlineWordCount + accentWordCount) * WORD_STAGGER;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <div className="min-w-0">
          <p
            className="inline-flex animate-rise items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-card backdrop-blur motion-reduce:animate-none"
            style={delay(0)}
          >
            <LockKeyhole className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Sign-in only · Lords Institute of Engineering and Technology, Hyderabad
          </p>

          <h1
            className="mt-5 max-w-2xl text-balance text-[clamp(2.25rem,5.4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-navy-950"
            aria-label={`${HEADLINE} ${HEADLINE_ACCENT}`}
          >
            <span aria-hidden="true">
              <Words text={HEADLINE} />{" "}
              <Words text={HEADLINE_ACCENT} className="text-brand-600" offset={headlineWordCount} />
            </span>
          </h1>

          <p
            className="mt-5 max-w-xl animate-rise text-base leading-7 text-slate-600 motion-reduce:animate-none"
            style={delay(afterHeadline)}
          >
            BusTrack puts the published {HOME_STATS.scheduleYear} pickup list in your pocket:{" "}
            {HOME_STATS.routes} routes, {HOME_STATS.stops} stops, your boarding point, and an
            arrival estimate that always says what it is based on. Nothing here pretends to be
            live vehicle tracking.
          </p>

          <div
            className="mt-8 flex animate-rise flex-col gap-2.5 motion-reduce:animate-none sm:flex-row"
            style={delay(afterHeadline + BLOCK_STAGGER)}
          >
            <ButtonLink href="/signup" size="lg" className="group">
              Create a student account
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </ButtonLink>
            <ButtonLink href="/login" variant="outline" size="lg">
              Sign in
            </ButtonLink>
          </div>

          <dl
            className="mt-10 grid max-w-lg animate-rise grid-cols-3 gap-4 border-t border-slate-100 pt-6 motion-reduce:animate-none"
            style={delay(afterHeadline + BLOCK_STAGGER * 2)}
          >
            {STATS.map((stat, index) => (
              <div key={stat.term} className="min-w-0">
                <dt className="text-xs text-slate-500">{stat.term}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-navy-950">
                  <CountUp value={stat.value} delay={afterHeadline + 0.2 + index * 0.1} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative min-w-0 animate-rise motion-reduce:animate-none" style={delay(0.25)}>
          <div className="pointer-events-none absolute -inset-x-6 -top-8 bottom-10 rounded-[2.5rem] bg-gradient-to-b from-brand-50 via-white to-transparent" aria-hidden="true" />
          <div className="relative mx-auto -mb-5 w-[min(100%,21rem)] px-6 sm:-mb-7 sm:w-[min(100%,24rem)]">
            <BusIllustration />
          </div>
          <RouteSchematic className="relative" animated />
        </div>
      </div>
    </section>
  );
}
