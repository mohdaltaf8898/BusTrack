"use client";

import { m, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * BusTrack's bus: an inline, brand-coloured vector illustration (no raster
 * asset, no external request). `animated` adds a gentle idle — a slow bob,
 * turning wheels and passing road lines — which is skipped under reduced
 * motion. It is decorative: `aria-hidden` unless a `title` is supplied.
 */
export function BusIllustration({
  className,
  animated = true,
  title,
}: {
  className?: string;
  animated?: boolean;
  title?: string;
}) {
  const reduceMotion = useReducedMotion();
  const live = animated && !reduceMotion;
  const id = useId();
  const bodyGradient = `${id}-body`;
  const glassGradient = `${id}-glass`;

  const wheel = (cx: number) => (
    <g transform={`translate(${cx} 118)`}>
      <circle r="19" fill="#0a182c" />
      <m.g
        animate={live ? { rotate: 360 } : undefined}
        transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
      >
        <circle r="10.5" fill="#e2e8f0" />
        <path d="M0-9v18M-9 0h18M-6.4-6.4l12.8 12.8M6.4-6.4l-12.8 12.8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <circle r="3.2" fill="#0a182c" />
      </m.g>
    </g>
  );

  return (
    <svg
      viewBox="0 0 340 160"
      className={cn("block h-auto w-full", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={bodyGradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.55" stopColor="#1c5ff0" />
          <stop offset="1" stopColor="#164bdc" />
        </linearGradient>
        <linearGradient id={glassGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eff6ff" />
          <stop offset="1" stopColor="#bfdbfe" />
        </linearGradient>
      </defs>

      {/* Road and shadow */}
      <line x1="16" y1="140" x2="324" y2="140" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="172" cy="141" rx="118" ry="5" fill="#0a182c" opacity="0.08" />

      {/* Passing road lines */}
      {[0, 1, 2].map((index) => (
        <m.line
          key={index}
          x1={18}
          x2={44 - index * 8}
          y1={78 + index * 18}
          y2={78 + index * 18}
          stroke="#bfdbfe"
          strokeWidth="3"
          strokeLinecap="round"
          initial={false}
          animate={live ? { x: [0, -22], opacity: [0, 0.9, 0] } : { opacity: 0.35 }}
          transition={{ duration: 1.1, ease: "easeOut", repeat: Infinity, delay: index * 0.25 }}
        />
      ))}

      <m.g
        animate={live ? { y: [0, -1.6, 0] } : undefined}
        transition={{ duration: 2.6, ease: "easeInOut", repeat: Infinity }}
      >
        {/* Body */}
        <rect x="44" y="34" width="268" height="86" rx="20" fill={`url(#${bodyGradient})`} />
        <rect x="60" y="28" width="236" height="12" rx="6" fill="#122946" />
        <rect x="44" y="92" width="268" height="5" fill="#ffffff" opacity="0.35" />

        {/* Windows */}
        {[70, 114, 158].map((x) => (
          <rect key={x} x={x} y="46" width="36" height="30" rx="8" fill={`url(#${glassGradient})`} />
        ))}
        {/* Door */}
        <rect x="206" y="46" width="30" height="62" rx="7" fill="#dbeafe" />
        <line x1="221" y1="50" x2="221" y2="104" stroke="#93c5fd" strokeWidth="2" />
        {/* Windscreen */}
        <path d="M250 46h36a18 18 0 0 1 18 18v12H250z" fill={`url(#${glassGradient})`} />
        <path d="M262 50l-6 24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />

        {/* Lights and bumper */}
        <circle cx="305" cy="104" r="5.5" fill="#fde68a" />
        <circle cx="305" cy="104" r="2.5" fill="#fbbf24" />
        <rect x="46" y="100" width="7" height="8" rx="2" fill="#fb7185" />
        <rect x="40" y="110" width="280" height="9" rx="4.5" fill="#122946" />

        {/* Destination sign */}
        <rect x="256" y="34" width="46" height="8" rx="3" fill="#0a182c" />
        <rect x="262" y="37" width="20" height="2" rx="1" fill="#fbbf24" />

        {wheel(104)}
        {wheel(256)}
      </m.g>
    </svg>
  );
}
