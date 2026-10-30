import { describe, expect, it, vi } from "vitest";
import { createLocationSynchronizer, type LocationReadContext } from "@/lib/location-sync";

const initialContext: LocationReadContext = {
  userId: "user-1", role: "student", routeId: "route-01", busId: "bus-sim01",
};
const reading = { bus_id: "bus-sim01", route_id: "route-01", recorded_at: "2026-10-30T10:00:00Z" };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  let context: LocationReadContext | null = { ...initialContext };
  const getAccessToken = vi.fn(async () => "token" as string | null);
  const fetchLocation = vi.fn(async (_busId: string, _token: string): Promise<Response> => ok({ location: reading, live: true }));
  const apply = vi.fn();
  const sync = createLocationSynchronizer({ getContext: () => context, getAccessToken, fetchLocation, apply });
  return { sync, getAccessToken, fetchLocation, apply, setContext: (value: LocationReadContext | null) => { context = value; } };
}

describe("authorized location synchronization", () => {
  it("uses current API sharing state, not a delayed Realtime event, to label a location", async () => {
    const { sync, fetchLocation, apply } = setup();
    fetchLocation.mockResolvedValueOnce(ok({ location: reading, live: false }));
    await sync.refresh("bus-sim01");
    expect(fetchLocation).toHaveBeenCalledWith("bus-sim01", "token");
    expect(apply).toHaveBeenCalledWith({ kind: "location", context: initialContext, row: reading, live: false });
  });

  it("ignores Realtime events for an unselected bus or a missing signed-in context", async () => {
    const { sync, fetchLocation, setContext } = setup();
    await sync.refresh("other-bus");
    setContext(null);
    await sync.refresh("bus-sim01");
    expect(fetchLocation).not.toHaveBeenCalled();
  });

  it("does not let an older in-flight live read overwrite a later paused read", async () => {
    const { sync, fetchLocation, apply } = setup();
    const older = deferred<Response>();
    fetchLocation.mockReturnValueOnce(older.promise).mockResolvedValueOnce(ok({ location: reading, live: false }));
    const first = sync.refresh();
    await Promise.resolve();
    await sync.refresh("bus-sim01");
    older.resolve(ok({ location: reading, live: true }));
    await first;
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ kind: "location", context: initialContext, row: reading, live: false });
  });

  it.each([
    ["sign-out", null],
    ["account switch", { ...initialContext, userId: "user-2" }],
    ["role change", { ...initialContext, role: "admin" }],
    ["route change", { ...initialContext, routeId: "route-02" }],
    ["bus reassignment", { ...initialContext, busId: "bus-sim02" }],
  ])("discards in-flight responses after %s", async (_label, changedContext) => {
    const { sync, fetchLocation, apply, setContext } = setup();
    const pending = deferred<Response>();
    fetchLocation.mockReturnValueOnce(pending.promise);
    const request = sync.refresh();
    await Promise.resolve();
    setContext(changedContext);
    pending.resolve(ok({ location: reading, live: true }));
    await request;
    expect(apply).not.toHaveBeenCalled();
  });

  it("clears a denied, expired or missing-session location but retains state on transient errors", async () => {
    const { sync, fetchLocation, getAccessToken, apply } = setup();
    fetchLocation.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await sync.refresh();
    fetchLocation.mockResolvedValueOnce(ok({ location: null, live: false }));
    await sync.refresh();
    getAccessToken.mockResolvedValueOnce(null);
    await sync.refresh();
    fetchLocation.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await sync.refresh();
    expect(apply).toHaveBeenCalledTimes(3);
    expect(apply).toHaveBeenNthCalledWith(1, { kind: "clear", context: initialContext });
    expect(apply).toHaveBeenNthCalledWith(2, { kind: "clear", context: initialContext });
    expect(apply).toHaveBeenNthCalledWith(3, { kind: "clear", context: initialContext });
  });

  it("invalidates in-flight requests on cleanup and ignores malformed responses", async () => {
    const { sync, fetchLocation, apply } = setup();
    const pending = deferred<Response>();
    fetchLocation.mockReturnValueOnce(pending.promise);
    const request = sync.refresh();
    await Promise.resolve();
    sync.invalidate();
    pending.resolve(ok({ location: reading, live: true }));
    await request;
    fetchLocation.mockResolvedValueOnce(new Response("not json", { status: 200 }));
    await sync.refresh();
    expect(apply).not.toHaveBeenCalled();
  });
});
