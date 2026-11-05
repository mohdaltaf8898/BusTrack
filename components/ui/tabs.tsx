"use client";

import { m } from "motion/react";
import { useId, type ReactNode } from "react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

/** Underline tabs; the active indicator slides between tabs. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div
      className={cn(
        "no-scrollbar flex gap-4 overflow-x-auto border-b border-slate-200",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <m.button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "relative inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 px-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              selected ? "text-navy-950" : "text-slate-600 hover:text-navy-800",
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === "number" && item.count > 0 && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  selected ? "text-brand-700" : "text-slate-500",
                )}
              >
                {item.count}
              </span>
            )}
            {selected && (
              <m.span
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600"
                transition={SPRING.gentle}
                aria-hidden="true"
              />
            )}
          </m.button>
        );
      })}
    </div>
  );
}
