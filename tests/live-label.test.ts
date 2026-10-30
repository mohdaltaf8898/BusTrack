import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  isSupabaseConfigured: true,
  backendConfig: {
    enabled: true, demoMode: false, publicConfigured: true, serverConfigured: true,
    realtimeConfigured: true, simulationSpeedMultiplier: 8, staleLocationSeconds: 45,
  },
}));

import { createInitialState, appReducer } from "@/lib/app-reducer";
import { deriveRouteSnapshot } from "@/lib/selectors";
import { demoUsers } from "@/data/routes";
import { mapBackendData } from "@/lib/backend-mapping";
import type { RemoteBusLocation } from "@/lib/types";

const now = 1_700_000_000_000;
function location(overrides: Partial<RemoteBusLocation> = {}): RemoteBusLocation {
  return {
    busId: "bus-sim01", routeId: "route-01", lat: 17.389948, lng: 78.451726,
    heading: null, speedKmh: null, recordedAt: now - 1_000,
    source: "gps", sharingEnabled: true, ...overrides,
  };
}
function stateWithRemote(remote: RemoteBusLocation) {
  return { ...createInitialState(now), hydrated: true, user: { ...demoUsers.student }, remoteLocations: { "route-01": remote } };
}

describe("live and last-known GPS labels", () => {
  it("shows live only while the driver is sharing and a location is fresh", () => {
    expect(deriveRouteSnapshot(stateWithRemote(location()), "route-01").dataMode).toBe("live");
    expect(deriveRouteSnapshot(stateWithRemote(location({ sharingEnabled: false })), "route-01").dataMode).toBe("last-known");
    expect(deriveRouteSnapshot(stateWithRemote(location({ recordedAt: now - 50_000 })), "route-01").dataMode).toBe("last-known");
  });

  it("does not display an expired last-known position to a student", () => {
    const snapshot = deriveRouteSnapshot(stateWithRemote(location({ recordedAt: now - 15 * 60_000 - 1 })), "route-01");
    expect(snapshot.remoteLocation).toBeUndefined();
    expect(snapshot.dataMode).toBe("simulation");
  });

  it("clears cached locations on sign-out and explicit server expiry", () => {
    const state = stateWithRemote(location());
    expect(appReducer(state, { type: "SET_USER", user: null }).remoteLocations).toEqual({});
    expect(appReducer(state, { type: "CLEAR_REMOTE_LOCATION", routeId: "route-01" }).remoteLocations).toEqual({});
  });

  it("does not fabricate backend drivers or buses when the database returns empty lists", () => {
    const mapped = mapBackendData({ routes: [], stops: [], buses: [], drivers: [] }, now);
    expect(mapped.buses).toEqual([]);
    expect(mapped.drivers).toEqual([]);
    const updated = appReducer(stateWithRemote(location()), {
      type: "SET_BACKEND_DATA", routes: mapped.routes, buses: mapped.buses, drivers: mapped.drivers,
      delayReports: [], backendTrips: [], message: "Loaded",
    });
    expect(updated.buses).toEqual([]);
    expect(updated.drivers).toEqual([]);
  });
});
