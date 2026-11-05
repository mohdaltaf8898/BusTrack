"use client";

import Link from "next/link";
import { m, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { SPRING, TAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-action hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none",
  secondary:
    "bg-navy-900 text-white shadow-sm hover:bg-navy-800 active:bg-navy-950 disabled:bg-navy-300",
  outline:
    "border border-navy-100 bg-white text-navy-800 hover:border-brand-200 hover:bg-brand-50",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3 text-xs gap-1.5",
  md: "h-11 rounded-xl px-4 text-sm gap-2",
  lg: "h-12 rounded-xl px-5 text-sm gap-2",
  icon: "h-11 w-11 rounded-xl",
};

export function buttonClasses(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex shrink-0 touch-manipulation select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
    variants[options.variant ?? "primary"],
    sizes[options.size ?? "md"],
    options.className,
  );
}

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Button with press feedback: a short spring scale on pointer/touch down that
 * releases on up. Colour changes stay CSS transitions; the scale is skipped
 * while disabled or loading and under reduced motion.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, children, disabled, ...props },
  ref,
) {
  const inert = Boolean(disabled || loading);
  return (
    <m.button
      ref={ref}
      className={buttonClasses({ variant, size, className })}
      disabled={inert}
      whileTap={inert ? undefined : TAP}
      transition={SPRING.tap}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </m.button>
  );
});

const MotionLink = m.create(Link);

export interface ButtonLinkProps extends ComponentProps<typeof MotionLink> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Link styled as a button, with the same press feedback. */
export function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <MotionLink
      className={buttonClasses({ variant, size, className })}
      whileTap={TAP}
      transition={SPRING.tap}
      {...props}
    >
      {children}
    </MotionLink>
  );
}
