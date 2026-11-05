"use client";

import { m, type HTMLMotionProps } from "motion/react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<HTMLMotionProps<"button">, "onChange" | "value" | "children"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Toggle with a spring-loaded knob and animated track colour. */
export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <m.button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-slate-300",
        className,
      )}
      {...props}
    >
      <m.span
        className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
        initial={false}
        animate={{ x: checked ? 24 : 4 }}
        transition={SPRING.gentle}
      />
    </m.button>
  );
}
