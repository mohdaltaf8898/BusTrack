"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/state/app-provider";
import { MapSkeleton } from "@/components/maps/map-skeleton";
import type { LiveMapProps } from "@/components/maps/map-types";

const LiveMapInner = dynamic(
  () => import("@/components/maps/live-map-inner").then((module) => module.LiveMapInner),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

export function LiveMap(props: LiveMapProps) {
  const { state } = useApp();
  return <LiveMapInner {...props} browserOffline={props.browserOffline ?? !state.isOnline} />;
}
