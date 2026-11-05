"use client";

import { AnimatePresence, m } from "motion/react";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { DURATION, EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface FaqItem {
  q: string;
  a: string;
}

function FaqEntry({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  const panelId = useId();
  const buttonId = useId();
  return (
    <RevealItem
      as="div"
      variant="small"
      className={cn(
        "rounded-2xl border bg-white px-5 transition-[border-color,box-shadow] duration-200",
        open ? "border-brand-200 shadow-card" : "border-slate-200",
      )}
    >
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-sm font-semibold text-navy-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-xl"
        >
          {item.q}
          <m.span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            animate={{ rotate: open ? 45 : 0, backgroundColor: open ? "rgb(238 246 255)" : "rgb(241 245 249)" }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            aria-hidden="true"
          >
            <Plus className={cn("h-4 w-4", open && "text-brand-700")} />
          </m.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: { duration: DURATION.base, ease: EASE_OUT }, opacity: { duration: 0.2, delay: 0.08 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.22, ease: EASE_IN_OUT }, opacity: { duration: 0.12 } } }}
            className="overflow-hidden"
          >
            <p className="pb-4 pt-0.5 text-sm leading-6 text-slate-600">{item.a}</p>
          </m.div>
        )}
      </AnimatePresence>
    </RevealItem>
  );
}

/** Accordion of common questions; one answer open at a time per column. */
export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <RevealGroup stagger={0.05} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <FaqEntry
          key={item.q}
          item={item}
          open={openIndex === index}
          onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
        />
      ))}
    </RevealGroup>
  );
}
