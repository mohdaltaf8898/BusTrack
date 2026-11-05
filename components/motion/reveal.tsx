"use client";

import { m, type HTMLMotionProps, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { fadeIn, fadeUp, fadeUpSmall, REVEAL_VIEWPORT, staggerChildren } from "@/lib/motion";

const tags = {
  div: m.div,
  section: m.section,
  article: m.article,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
  p: m.p,
  span: m.span,
  figure: m.figure,
  header: m.header,
  footer: m.footer,
  h1: m.h1,
  h2: m.h2,
  h3: m.h3,
  dl: m.dl,
  nav: m.nav,
} as const;

export type RevealTag = keyof typeof tags;
export type RevealVariant = "up" | "fade" | "small";

const variantMap: Record<RevealVariant, Variants> = {
  up: fadeUp,
  fade: fadeIn,
  small: fadeUpSmall,
};

type MotionDivProps = Omit<HTMLMotionProps<"div">, "children" | "variants" | "initial" | "animate" | "whileInView" | "viewport">;

export interface RevealProps extends MotionDivProps {
  /** Element to render. */
  as?: RevealTag;
  /** Entrance style. */
  variant?: RevealVariant;
  /** Extra delay in seconds before the entrance starts. */
  delay?: number;
  /**
   * `view` (default) animates when the element scrolls into view, once.
   * `mount` animates as soon as it renders — use for above-the-fold content.
   */
  trigger?: "view" | "mount";
  children?: ReactNode;
}

function withDelay(variants: Variants, delay: number): Variants {
  if (!delay) return variants;
  const visible = variants.visible;
  if (typeof visible !== "object" || visible === null || !("transition" in visible)) return variants;
  return {
    ...variants,
    visible: { ...visible, transition: { ...(visible.transition as object), delay } },
  };
}

/**
 * Fade/slide an element in. Used for section headings, cards and anything that
 * should arrive quietly as the reader reaches it. With reduced motion the
 * slide is dropped and only opacity animates (see `MotionProvider`).
 */
export function Reveal({
  as = "div",
  variant = "up",
  delay = 0,
  trigger = "view",
  children,
  ...props
}: RevealProps) {
  const Component = tags[as] as typeof m.div;
  const variants = withDelay(variantMap[variant], delay);
  return (
    <Component
      variants={variants}
      initial="hidden"
      {...(trigger === "mount" ? { animate: "visible" } : { whileInView: "visible", viewport: REVEAL_VIEWPORT })}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface RevealGroupProps extends MotionDivProps {
  as?: RevealTag;
  /** Delay between children, in seconds. */
  stagger?: number;
  /** Delay before the first child, in seconds. */
  delay?: number;
  trigger?: "view" | "mount";
  children?: ReactNode;
}

/**
 * Parent for staggered entrances. Children should be `RevealItem`s (or any
 * `m.*` element with `variants`); they inherit the `hidden`/`visible` state.
 */
export function RevealGroup({
  as = "div",
  stagger = 0.06,
  delay = 0,
  trigger = "view",
  children,
  ...props
}: RevealGroupProps) {
  const Component = tags[as] as typeof m.div;
  return (
    <Component
      variants={staggerChildren(stagger, delay)}
      initial="hidden"
      {...(trigger === "mount" ? { animate: "visible" } : { whileInView: "visible", viewport: REVEAL_VIEWPORT })}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface RevealItemProps extends MotionDivProps {
  as?: RevealTag;
  variant?: RevealVariant;
  children?: ReactNode;
}

/** A staggered child of `RevealGroup`. */
export function RevealItem({ as = "div", variant = "up", children, ...props }: RevealItemProps) {
  const Component = tags[as] as typeof m.div;
  return (
    <Component variants={variantMap[variant]} {...props}>
      {children}
    </Component>
  );
}
