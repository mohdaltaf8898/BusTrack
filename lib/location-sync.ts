// Realtime INSERT messages carry a position, not the current trip/sharing state.
// Treat them as invalidation signals and re-read through the authorized API.
export interface LocationReadContext {
  userId: string;
  role: string;
  routeId: string;
  busId: string;
}

type LocationReadResult =
  | { kind: "clear"; context: LocationReadContext }
  | { kind: "location"; context: LocationReadContext; row: Record<string, unknown>; live: boolean };

interface LocationSynchronizerOptions {
  getContext: () => LocationReadContext | null;
  getAccessToken: () => Promise<string | null>;
  fetchLocation: (busId: string, token: string) => Promise<Response>;
  apply: (result: LocationReadResult) => void;
}

function sameContext(a: LocationReadContext, b: LocationReadContext | null) {
  return Boolean(
    b && a.userId === b.userId && a.role === b.role && a.routeId === b.routeId && a.busId === b.busId,
  );
}

export function createLocationSynchronizer(options: LocationSynchronizerOptions) {
  let sequence = 0;
  return {
    invalidate() {
      sequence += 1;
    },
    async refresh(eventBusId?: string) {
      const context = options.getContext();
      if (!context || (eventBusId && eventBusId !== context.busId)) return;
      const requestId = ++sequence;
      const isCurrent = () => requestId === sequence && sameContext(context, options.getContext());
      try {
        const token = await options.getAccessToken();
        if (!isCurrent()) return;
        if (!token) {
          options.apply({ kind: "clear", context });
          return;
        }
        const response = await options.fetchLocation(context.busId, token);
        if (!isCurrent()) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            options.apply({ kind: "clear", context });
          }
          return;
        }
        const body: unknown = await response.json();
        if (!isCurrent() || !body || typeof body !== "object" || Array.isArray(body)) return;
        const data = body as Record<string, unknown>;
        if (data.location === null) {
          options.apply({ kind: "clear", context });
        } else if (data.location && typeof data.location === "object" && !Array.isArray(data.location)) {
          options.apply({
            kind: "location",
            context,
            row: data.location as Record<string, unknown>,
            live: data.live === true,
          });
        }
      } catch {
        // An offline/failed read is not evidence of a new sharing state. The
        // selector's freshness limit eventually removes the live label.
      }
    },
  };
}
