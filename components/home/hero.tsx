import { Fragment, type CSSProperties } from "react";
import { BusIllustration } from "@/components/motion/bus-illustration";
import { RouteSchematic } from "@/components/home/route-schematic";
import { HOME_STATS } from "@/components/home/stats";
import { ButtonLink } from "@/components/ui/button";

const HEADLINE = "Know which bus is coming, and roughly when";

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
        <Fragment key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span
              className={`inline-block animate-word-rise motion-reduce:animate-none ${className ?? ""}`}
              style={delay(BLOCK_STAGGER + (offset + index) * WORD_STAGGER)}
            >
              {word}
            </span>
          </span>
          {/* The space must sit between the clipped inline-blocks; a trailing
              space inside one is collapsed and the words run together. */}
          {index < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </>
  );
}

const headlineWordCount = HEADLINE.split(" ").length;
const afterHeadline = BLOCK_STAGGER + headlineWordCount * WORD_STAGGER;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero" aria-hidden="true" />
      {/* Soft colour for the frosted schematic card to blur. */}
      <div className="glow-blob -left-16 top-[55%] h-64 w-64 bg-brand-200/60" aria-hidden="true" />
      <div className="glow-blob right-[8%] top-10 h-72 w-72 bg-brand-100/80 lg:right-[30%]" aria-hidden="true" />
      <div className="glow-blob -right-20 bottom-0 h-64 w-64 bg-navy-200/50" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <div className="min-w-0">
          <h1
            className="max-w-2xl text-balance text-[clamp(2.125rem,5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-navy-950"
            aria-label={HEADLINE}
          >
            <span aria-hidden="true">
              <Words text={HEADLINE} />
            </span>
          </h1>

          <p
            className="mt-5 max-w-xl animate-rise text-pretty text-base leading-7 text-slate-600 motion-reduce:animate-none"
            style={delay(afterHeadline)}
          >
            BusTrack carries the published {HOME_STATS.scheduleYear} pickup list for Lords Institute of
            Engineering and Technology, Hyderabad: {HOME_STATS.routes} routes, {HOME_STATS.stops} stops,
            your boarding point, and an arrival estimate that states what it is based on. A live bus
            position appears only while an authorized driver is sharing GPS.
          </p>

          <div
            className="mt-8 flex animate-rise flex-col gap-2.5 motion-reduce:animate-none sm:flex-row"
            style={delay(afterHeadline + BLOCK_STAGGER)}
          >
            <ButtonLink href="/signup" size="lg">
              Create a student account
            </ButtonLink>
            <ButtonLink href="/login" variant="outline" size="lg">
              Sign in
            </ButtonLink>
          </div>
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
