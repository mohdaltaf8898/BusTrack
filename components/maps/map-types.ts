import type { BusStatus, PointOnRoute, Route, RouteGeometry } from "@/lib/types";

export interface LiveMapProps {
  route: Route;
  geometry: RouteGeometry;
  busPosition: PointOnRoute;
  progressDistanceMeters: number;
  busStatus: BusStatus;
  selectedStopId: string;
  isStale: boolean;
  isLiveData: boolean;
  browserOffline?: boolean;
  className?: string;
  onSelectStop?: (stopId: string) => void;
  showControls?: boolean;
  /**
   * Space (px) to keep clear at the bottom of the map for overlays such as a
   * bottom sheet: Leaflet controls and the heading badge move up by this much.
   */
  bottomInset?: number;
}
