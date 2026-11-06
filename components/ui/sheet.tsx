"use client";

import { AnimatePresence, m, useDragControls, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { shouldDismiss } from "@/lib/gestures";
import { DURATION, scaleIn, SPRING } from "@/lib/motion";
import { useIsDesktopSheet } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared overlay behaviour: lock page scroll, close on Escape, move focus into
 * the panel on open and give it back on close.
 */
export function useModalBehaviour(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, panelRef]);
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /**
   * `sheet` always slides up from the bottom. `auto` does so on phones and
   * becomes a centred dialog from the `sm` breakpoint up.
   */
  presentation?: "sheet" | "auto";
  /** Tailwind z-index class for the overlay layer. */
  layerClassName?: string;
  /** Label for the header close button and the backdrop. */
  closeLabel?: string;
  /** Hide the built-in header when the content provides its own. */
  hideHeader?: boolean;
  /** Accessible name when no visible title is rendered. */
  "aria-label"?: string;
}

/**
 * Bottom sheet / dialog with swipe-to-dismiss.
 *
 * On phones the panel springs up from the bottom edge and can be dragged down
 * to close: the grab handle and header start the drag, while the content area
 * keeps native scrolling. Releasing past 30% of the panel height, or with a
 * quick downward flick, dismisses it; otherwise it springs back.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  presentation = "sheet",
  layerClassName = "z-[80]",
  closeLabel = "Close",
  hideHeader = false,
  "aria-label": ariaLabel,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const desktop = useIsDesktopSheet() && presentation === "auto";
  const titleId = useId();
  const descriptionId = useId();
  useModalBehaviour(open, onClose, panelRef);
  // Render into <body> so transformed ancestors (page transitions, hover lifts)
  // never become the containing block of the fixed overlay.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setPortalTarget(document.body), []);

  const startDrag = (event: ReactPointerEvent) => {
    if (desktop) return;
    controls.start(event);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const height = panelRef.current?.offsetHeight ?? 400;
    if (shouldDismiss({ offset: info.offset.y, velocity: info.velocity.y, height })) onClose();
  };

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 flex justify-center",
            desktop ? "items-center p-4" : "items-end",
            layerClassName,
          )}
        >
          {/* Pointer-only dismiss surface; keyboard users have Escape and the header button. */}
          <m.div
            aria-hidden="true"
            className="absolute inset-0 touch-none bg-navy-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base }}
            onClick={onClose}
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title && !hideHeader ? titleId : undefined}
            aria-describedby={description && !hideHeader ? descriptionId : undefined}
            aria-label={ariaLabel}
            tabIndex={-1}
            className={cn(
              "glass-strong glass-edge relative z-10 flex w-full flex-col outline-none",
              desktop
                ? "max-h-[88vh] max-w-lg rounded-3xl"
                : "max-h-[92dvh] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),0.25rem)]",
              className,
            )}
            {...(desktop
              ? { variants: scaleIn, initial: "hidden", animate: "visible", exit: "exit" }
              : {
                  initial: { y: "100%" },
                  animate: { y: 0 },
                  exit: { y: "100%" },
                  transition: SPRING.sheet,
                  drag: "y" as const,
                  dragControls: controls,
                  dragListener: false,
                  dragConstraints: { top: 0, bottom: 0 },
                  dragElastic: { top: 0, bottom: 1 },
                  dragTransition: { bounceStiffness: 520, bounceDamping: 42 },
                  onDragEnd,
                })}
          >
            {!desktop && (
              <div
                className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing"
                onPointerDown={startDrag}
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-slate-300" />
              </div>
            )}

            {!hideHeader && (
              <div
                className={cn("flex items-start justify-between gap-4 px-5", desktop ? "pt-5" : "touch-none pt-1")}
                onPointerDown={startDrag}
              >
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-lg font-semibold tracking-tight text-navy-950">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-500">
                      {description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="-mr-2 -mt-1 shrink-0 text-slate-500"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5", hideHeader ? "pt-3" : "pt-4", footer ? "pb-2" : "pb-5")}>
              {children}
            </div>

            {footer && (
              <div className="flex flex-col-reverse gap-2 px-5 pb-5 pt-3 sm:flex-row sm:justify-end">{footer}</div>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget,
  );
}
