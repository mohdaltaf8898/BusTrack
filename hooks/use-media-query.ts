"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. Returns `false` during server rendering and
 * the first client render, so components that branch on it should only do so
 * after hydration (every workspace page renders behind `RequireAuth`, which
 * already waits for client state).
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener?.("change", onChange);
      return () => list.removeEventListener?.("change", onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Tailwind `sm` breakpoint and up. */
export function useIsDesktopSheet() {
  return useMediaQuery("(min-width: 640px)");
}

/** Tailwind `md` breakpoint and up: the workspace shows its sidebar here. */
export function useIsWideScreen() {
  return useMediaQuery("(min-width: 768px)");
}
