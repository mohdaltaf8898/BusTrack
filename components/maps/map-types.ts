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
}
