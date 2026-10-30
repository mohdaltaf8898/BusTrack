"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { demoUsers, sampleRoutes } from "@/data/routes";
import { routeCoordinateKey, type RoadGeometry } from "@/lib/road-routing";
import {
  APP_STORAGE_KEY,
  appReducer,
  createInitialState,
  hydratePersistedState,
  toPersistedState,
  type PersistedAppState,
} from "@/lib/app-reducer";
import { mapBackendData, type BackendData } from "@/lib/backend-mapping";
import { backendConfig, isSupabaseConfigured, publicSupabaseConfig } from "@/lib/config";
import { authRedirect, inspectPasswordCallback, PASSWORD_PAGE, updatePasswordForToken, type PasswordLinkStatus } from "@/lib/auth-flow";
import { createLocationSynchronizer } from "@/lib/location-sync";
import { deriveRouteSnapshot, type RouteSnapshot } from "@/lib/selectors";
import {
  endDemoTrip,
  injectDelay,
  resetSimulation,
  resumeFromOffline,
  setSharing as setSharingSimulation,
  setSimulationOffline,
  startDemoTrip,
  togglePause,
  type SimulationUpdate,
} from "@/lib/simulation";
import type {
  AdminMutationPayload,
  BusInput,
  DelayReportInput,
  LocationInput,
  RouteInput,
  StopInput,
  TripActionInput,
} from "@/lib/validation-types";
import {
  busInputSchema,
  delayReportSchema,
  driverAssignmentSchema,
  firstZodError,
  locationPayloadSchema,
  routeInputSchema,
  stopInputSchema,
  tripActionSchema,
} from "@/lib/validation";
import type {
  AppState,
  AppUser,
  BackendConfig,
  NotificationItem,
  RemoteBusLocation,
  Route,
  SimulationEvent,
  SimulationState,
  UserRole,
} from "@/lib/types";
import { makeId, safeJsonParse } from "@/lib/utils";

type PushPermissionState = NotificationPermission | "unsupported";

interface RouteInputWithTemplate extends RouteInput {
  templateRouteId?: string;
}

interface AppContextValue {
  state: AppState;
  config: BackendConfig;
  snapshot: RouteSnapshot;
  unreadCount: number;
  pushPermission: PushPermissionState;
  getRouteSnapshot: (routeId: string, selectedStopId?: string) => RouteSnapshot;
  selectRoute: (routeId: string) => void;
  selectStop: (stopId: string) => void;
  setDemoRole: (role: UserRole) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ signedIn: boolean }>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  passwordLink: PasswordLinkStatus;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  requestPushPermission: () => Promise<PushPermissionState>;
  clearError: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  startTrip: (routeId?: string) => void;
  endTrip: (routeId?: string) => void;
  setSharing: (routeId: string, enabled: boolean) => void;
  togglePause: (routeId?: string) => void;
  reset: (routeId?: string) => void;
  injectDelay: (routeId?: string) => void;
  simulateOffline: (routeId?: string) => void;
  resumeOffline: (routeId?: string) => void;
  callTripApi: (payload: TripActionInput) => Promise<Record<string, unknown>>;
  submitLocation: (payload: LocationInput) => Promise<Record<string, unknown>>;
  refreshBackendData: () => Promise<void>;
  saveBus: (input: BusInput, id?: string) => Promise<void>;
  deleteBus: (id: string) => Promise<void>;
  saveRoute: (input: RouteInputWithTemplate, id?: string) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  saveStop: (routeId: string, input: StopInput, id?: string) => Promise<void>;
  deleteStop: (routeId: string, id: string) => Promise<void>;
  assignDriver: (busId: string, driverId: string | null) => Promise<void>;
  endTripAsAdmin: (routeId: string) => Promise<void>;
  reportDelay: (input: DelayReportInput) => Promise<void>;
  deleteDelayReport: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface RealtimeNotificationRow {
  id: string;
  title: string;
  message: string;
  type?: string | null;
  route_id?: string | null;
  bus_id?: string | null;
  is_simulated?: boolean | null;
  created_at: string;
}

interface RealtimeLocationRow {
  bus_id: string;
  route_id?: string | null;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed_kmh?: number | null;
  accuracy_meters?: number | null;
  recorded_at: string;
  source?: string | null;
}

async function readJsonSafely(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NOTIFICATION_TYPES = new Set([
  "delay",
  "approaching",
  "arrival",
  "trip_started",
  "trip_completed",
  "location_unavailable",
  "system",
]);

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, 0, (now) => createInitialState(now));
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [passwordLink, setPasswordLink] = useState<PasswordLinkStatus>({ status: "none" });
  const [pushPermission, setPushPermission] = useState<PushPermissionState>("default");
  const stateRef = useRef(state);
  stateRef.current = state;
  const passwordLinkRef = useRef(passwordLink);
  passwordLinkRef.current = passwordLink;
  const authClientRef = useRef<SupabaseClient | null>(null);
  const authCallbackRef = useRef<(Pick<ReturnType<typeof inspectPasswordCallback>, "kind" | "incoming" | "malformed"> & { accessToken: string | null }) | null>(null);
  const authSyncRef = useRef(0);
  const authEventRef = useRef(0);
  const passwordFlowRef = useRef(0);
  const lastPushRef = useRef(0);
  const backendRequestRef = useRef(0);

  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const parseLocationRow = useCallback(
    (row: RealtimeLocationRow, sharingEnabled: boolean): RemoteBusLocation | null => {
      const buses = stateRef.current.buses;
      const bus = buses.find((item) => item.id === row.bus_id);
      const routeId = row.route_id ?? bus?.routeId;
      const recordedAt = new Date(row.recorded_at).getTime();
      if (!routeId || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || !Number.isFinite(recordedAt)) {
        return null;
      }
      return {
        busId: row.bus_id,
        routeId,
        lat: Number(row.latitude),
        lng: Number(row.longitude),
        heading: typeof row.heading === "number" ? row.heading : null,
        speedKmh: typeof row.speed_kmh === "number" ? row.speed_kmh : null,
        accuracyMeters:
          typeof row.accuracy_meters === "number" ? row.accuracy_meters : null,
        recordedAt,
        source: row.source === "gps" ? "gps" : "simulation",
        sharingEnabled,
      };
    },
    [],
  );

  useEffect(() => {
    const now = Date.now();
    lastPushRef.current = now;
    let nextState: AppState = { ...createInitialState(now), hydrated: true };
    try {
      const parsed = safeJsonParse<PersistedAppState>(
        window.localStorage.getItem(APP_STORAGE_KEY),
      );
      if (parsed?.version === 1) {
        nextState = hydratePersistedState(parsed, now);
      }
      if (isSupabaseConfigured) {
        nextState = { ...nextState, user: null, authLoading: true };
      }
    } catch {
      nextState = {
        ...nextState,
        error: "Saved demo state could not be loaded. Fresh sample data was restored.",
      };
    }
    nextState = { ...nextState, isOnline: navigator.onLine !== false };
    dispatch({ type: "HYDRATE", state: nextState });
  }, []);

  useEffect(() => {
    if (!state.hydrated || !state.isOnline) return;
    const route = state.routes.find((item) => item.id === state.selectedRouteId);
    if (!route || route.geometrySource !== "straight") return;
    const published = sampleRoutes.find((item) => item.id === route.id);
    // Never replace a staff-edited route with geometry for old coordinates.
    if (!published || routeCoordinateKey(route) !== routeCoordinateKey(published)) return;
    const controller = new AbortController();
    void fetch(`/api/road-route?routeId=${encodeURIComponent(route.id)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const geometry = (await response.json()) as RoadGeometry;
        if (!controller.signal.aborted) {
          dispatch({ type: "SET_ROAD_GEOMETRY", routeId: route.id, geometry });
        }
      })
      .catch(() => { /* The labelled straight-line preview is the fallback. */ });
    return () => controller.abort();
  }, [state.hydrated, state.isOnline, state.selectedRouteId, state.routes]);

  useEffect(() => {
    const update = () => dispatch({ type: "SET_ONLINE", value: navigator.onLine });
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated || !isSupabaseConfigured) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        const config = (await response.json()) as {
          demoMode?: boolean;
          serverConfigured?: boolean;
          message?: string;
        };
        if (cancelled) return;
        if (config.demoMode || !config.serverConfigured) {
          dispatch({
            type: "SET_BACKEND_MESSAGE",
            ready: false,
            message:
              "Supabase public credentials are set, but the server-only service role is missing. API-backed GPS/admin actions are disabled; local demo data is active.",
          });
        } else if (config.message) {
          dispatch({ type: "SET_BACKEND_MESSAGE", ready: true, message: config.message });
        }
      } catch {
        // The demo engine remains available if the config endpoint cannot be reached.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    const now = Date.now();
    let lastTick = now;
    const interval = window.setInterval(() => {
      const tick = Date.now();
      const deltaSeconds = Math.max(0, (tick - lastTick) / 1000);
      lastTick = tick;
      dispatch({
        type: "TICK",
        now: tick,
        deltaSeconds,
        speedMultiplier: backendConfig.simulationSpeedMultiplier,
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.hydrated]);

  useEffect(() => {
    if (!state.hydrated || isSupabaseConfigured) return;
    const interval = window.setInterval(() => {
      try {
        window.localStorage.setItem(
          APP_STORAGE_KEY,
          JSON.stringify(toPersistedState(stateRef.current)),
        );
      } catch {
        // Storage may be unavailable in private browsing; the demo still works.
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [state.hydrated]);

  const syncSupabaseUser = useCallback(async (client: SupabaseClient, user: User) => {
    const syncId = ++authSyncRef.current;
    const { data: profile, error } = await client
      .from("profiles")
      .select("id,name,role")
      .eq("id", user.id)
      .maybeSingle();
    if (syncId !== authSyncRef.current) return;
    if (error || !profile) {
      dispatch({ type: "SET_USER", user: null });
      dispatch({
        type: "SET_ERROR",
        error:
          "Signed in, but no profile row was found. Apply the migration and seed a profile for this user.",
      });
      return;
    }

    let assignedBusId: string | undefined;
    let assignedRouteId: string | undefined;
    const role = profile.role as UserRole;
    if (role === "driver") {
      const { data: bus } = await client
        .from("buses")
        .select("id,assigned_route_id")
        .eq("driver_id", user.id)
        .maybeSingle();
      assignedBusId = bus?.id ?? undefined;
      assignedRouteId = bus?.assigned_route_id ?? undefined;
    }
    if (syncId !== authSyncRef.current) return;

    const name = typeof profile.name === "string" && profile.name
      ? profile.name
      : user.email?.split("@")[0] ?? "BusTrack user";
    const mapped: AppUser = {
      id: user.id,
      name,
      email: user.email ?? "",
      role,
      avatarInitials: initialsFromName(name) || "BT",
      provider: "supabase",
      assignedBusId,
      assignedRouteId,
    };
    dispatch({ type: "SET_USER", user: mapped });
    dispatch({ type: "SET_ERROR", error: null });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    if (!isSupabaseConfigured) {
      dispatch({ type: "SET_AUTH_LOADING", value: false });
      return;
    }

    const incoming = inspectPasswordCallback(window.location.href);
    if (incoming.redirect) {
      // Dashboard invitations use the site URL by default. Preserve the
      // fragment only for this same-origin navigation, before Supabase reads it.
      window.location.replace(incoming.redirect);
      return;
    }
    if (!authCallbackRef.current) {
      authCallbackRef.current = {
        kind: incoming.kind,
        incoming: incoming.incoming,
        malformed: incoming.malformed,
        // Kept only while the link is being verified; never stored in React
        // state, a request URL, logs, or persistent application storage.
        accessToken: incoming.kind && !incoming.malformed
          ? new URLSearchParams(window.location.hash.slice(1)).get("access_token")
          : null,
      };
    }
    const callback = authCallbackRef.current;
    const flowId = ++passwordFlowRef.current;
    const initialEvent = authEventRef.current;
    if (callback.incoming) {
      setPasswordLink(callback.kind && !callback.malformed
        ? { status: "verifying", kind: callback.kind }
        : { status: "invalid" });
    }

    if (!authClientRef.current) {
      authClientRef.current = createClient(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: { params: { eventsPerSecond: 5 } },
      });
    }
    const client = authClientRef.current;
    setSupabase(client);
    let cancelled = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      authEventRef.current += 1;
      // A demo role must not silently switch back to a saved privileged
      // session because of an initial-session or token-refresh event.
      if (stateRef.current.user?.provider === "demo" && event !== "SIGNED_IN" && event !== "PASSWORD_RECOVERY") return;
      if (session?.user) {
        void syncSupabaseUser(client, session.user);
      } else {
        authSyncRef.current += 1;
        dispatch({ type: "SET_USER", user: null });
      }
    });

    void (async () => {
      try {
        const initialized = await client.auth.initialize();
        // Verify the user in the original link as well as the active session.
        // An account switch during initialization must not bind the link to a
        // different user who happens to be signed in in another tab.
        const linkUser = callback.accessToken && !initialized.error
          ? await client.auth.getUser(callback.accessToken)
          : null;
        const { data, error } = await client.auth.getSession();
        if (cancelled) return;
        callback.accessToken = null;
        if (callback.kind && !callback.malformed && flowId === passwordFlowRef.current) {
          const user = linkUser?.data.user;
          const valid = !initialized.error && !error && !linkUser?.error && user && data.session?.user.id === user.id;
          setPasswordLink(valid && user
            ? { status: "ready", kind: callback.kind, userId: user.id, email: user.email ?? null }
            : { status: "invalid" });
        } else if (!callback.incoming && (initialized.error || error)) {
          dispatch({ type: "SET_ERROR", error: "The sign-in link is invalid or expired. Please try again." });
        }
        // A newer auth event wins over this possibly delayed initial read.
        if (authEventRef.current === initialEvent && stateRef.current.user?.provider !== "demo") {
          if (data.session?.user) {
            await syncSupabaseUser(client, data.session.user);
          } else {
            authSyncRef.current += 1;
            dispatch({ type: "SET_USER", user: null });
          }
        }
      } catch {
        if (!cancelled) {
          callback.accessToken = null;
          if (callback.incoming && flowId === passwordFlowRef.current) setPasswordLink({ status: "invalid" });
          dispatch({ type: "SET_ERROR", error: "Could not initialize authentication. Please try again." });
        }
      } finally {
        if (!cancelled) dispatch({ type: "SET_AUTH_LOADING", value: false });
      }
    })();

    return () => {
      cancelled = true;
      authSyncRef.current += 1;
      subscription.unsubscribe();
    };
  }, [state.hydrated, syncSupabaseUser]);

  const refreshBackendData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const user = stateRef.current.user;
    const userId = user?.provider === "supabase" ? user.id : null;
    const role = user?.provider === "supabase" ? user.role : null;
    const requestId = ++backendRequestRef.current;
    const isCurrent = () => {
      const current = stateRef.current.user;
      return requestId === backendRequestRef.current &&
        (current?.provider === "supabase" ? current.id : null) === userId &&
        (current?.provider === "supabase" ? current.role : null) === role;
    };
    try {
      // A selected demo role must never reuse an existing privileged session.
      const token = userId ? await getAccessToken() : null;
      if (!isCurrent()) return;
      const response = await fetch("/api/admin", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const body = await readJsonSafely(response);
      if (!isCurrent()) return;
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Could not load routes from the configured backend.",
        );
      }
      const mapped = mapBackendData((body.data ?? {}) as BackendData, Date.now());
      dispatch({
        type: "SET_BACKEND_DATA",
        routes: mapped.routes,
        buses: mapped.buses,
        drivers: mapped.drivers,
        delayReports: mapped.delayReports,
        backendTrips: mapped.trips,
        identity: { userId, role },
        message:
          typeof body.message === "string"
            ? body.message
            : "Supabase data loaded. Simulated positions remain until an authorized driver sends GPS.",
      });
    } catch (error) {
      if (isCurrent()) {
        dispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "Backend data could not be loaded.",
        });
      }
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!state.hydrated || !supabase) return;
    void refreshBackendData();
  }, [state.hydrated, supabase, state.user?.id, state.user?.role, state.user?.provider, refreshBackendData]);

  const locationSync = useMemo(
    () => createLocationSynchronizer({
      getContext: () => {
        const current = stateRef.current;
        const bus = current.buses.find((item) => item.routeId === current.selectedRouteId);
        if (current.user?.provider !== "supabase" || !bus) return null;
        return {
          userId: current.user.id,
          role: current.user.role,
          routeId: current.selectedRouteId,
          busId: bus.id,
        };
      },
      getAccessToken,
      fetchLocation: (busId, token) => fetch(`/api/locations?busId=${encodeURIComponent(busId)}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }),
      apply: (result) => {
        if (result.kind === "clear") {
          dispatch({ type: "CLEAR_REMOTE_LOCATION", routeId: result.context.routeId, context: result.context });
          return;
        }
        const row = result.row as unknown as RealtimeLocationRow;
        // A bus can have older readings from a previous assignment.
        if (row.bus_id !== result.context.busId || (row.route_id && row.route_id !== result.context.routeId)) {
          dispatch({ type: "CLEAR_REMOTE_LOCATION", routeId: result.context.routeId, context: result.context });
          return;
        }
        const location = parseLocationRow(row, result.live);
        if (location) dispatch({ type: "SET_REMOTE_LOCATION", location, context: result.context });
      },
    }),
    [getAccessToken, parseLocationRow],
  );

  useEffect(() => {
    if (!state.hydrated || !supabase || !isSupabaseConfigured) return;
    dispatch({ type: "SET_REALTIME_STATUS", value: "connecting" });
    const locationChannel = supabase
      .channel("bustrack-bus-locations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bus_locations" },
        (payload) => {
          // INSERT payloads cannot tell us whether sharing was subsequently
          // paused or the trip ended. Re-read current state before displaying it.
          const busId = (payload.new as Partial<RealtimeLocationRow>).bus_id;
          if (typeof busId === "string") void locationSync.refresh(busId);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          dispatch({ type: "SET_REALTIME_STATUS", value: "connected" });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          dispatch({ type: "SET_REALTIME_STATUS", value: "error" });
        }
      });

    const notificationChannel = supabase
      .channel("bustrack-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as RealtimeNotificationRow;
          if (!row.id || !row.title || !row.message) return;
          const type = NOTIFICATION_TYPES.has(row.type ?? "")
            ? (row.type as NotificationItem["type"])
            : "system";
          dispatch({
            type: "ADD_NOTIFICATION",
            notification: {
              id: row.id,
              type,
              title: row.title,
              message: row.message,
              createdAt: new Date(row.created_at).getTime(),
              readAt: null,
              routeId: row.route_id ?? undefined,
              busId: row.bus_id ?? undefined,
              simulated: Boolean(row.is_simulated),
            },
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(locationChannel);
      void supabase.removeChannel(notificationChannel);
    };
  }, [state.hydrated, supabase, locationSync]);

  useEffect(() => {
    if (!state.hydrated || !isSupabaseConfigured || state.user?.provider !== "supabase") return;
    void locationSync.refresh();
    const interval = window.setInterval(() => void locationSync.refresh(), 12_000);
    return () => {
      window.clearInterval(interval);
      locationSync.invalidate();
    };
  }, [state.hydrated, state.selectedRouteId, state.buses, state.user?.id, state.user?.role, state.user?.provider, locationSync]);

  useEffect(() => {
    if (!state.hydrated || typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);
  }, [state.hydrated]);

  useEffect(() => {
    if (
      !state.hydrated ||
      pushPermission !== "granted" ||
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }
    const latest = state.notifications[0];
    if (!latest || latest.createdAt <= lastPushRef.current) return;
    lastPushRef.current = latest.createdAt;
    new Notification(latest.title, {
      body: `${latest.message}${latest.simulated ? " — SIMULATED" : ""}`,
      tag: latest.id,
      icon: "/icons/icon.svg",
    });
  }, [state.hydrated, state.notifications, pushPermission]);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushPermission("unsupported");
      return "unsupported" as const;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    return permission;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        throw new Error("Supabase Auth is not configured. Use a demo role instead.");
      }
      dispatch({ type: "SET_AUTH_LOADING", value: true });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        setPasswordLink({ status: "none" });
        if (data.user) await syncSupabaseUser(supabase, data.user);
      } finally {
        dispatch({ type: "SET_AUTH_LOADING", value: false });
      }
    },
    [supabase, syncSupabaseUser],
  );

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error("Account creation is not configured in demo mode.");
    const { data: current, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error("Could not check the current session. Please try again.");
    if (current.session) throw new Error("Sign out of your current account before creating another one.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: authRedirect(window.location.origin, "/login"),
      },
    });
    if (error) throw new Error(error.message);
    if (data.session?.user) await syncSupabaseUser(supabase, data.session.user);
    return { signedIn: Boolean(data.session) };
  }, [supabase, syncSupabaseUser]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Password recovery is not configured in demo mode.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirect(window.location.origin, PASSWORD_PAGE),
    });
    if (error) throw new Error(error.message);
  }, [supabase]);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error("Password changes are not configured in demo mode.");
    const link = passwordLinkRef.current;
    if (link.status === "invalid" || link.status === "verifying") {
      throw new Error("This link cannot be used. Request a new password link.");
    }
    const user = stateRef.current.user;
    const expectedId = link.status === "ready"
      ? link.userId
      : user?.provider === "supabase" ? user.id : null;
    if (!expectedId) throw new Error("Sign in or open a valid password link first.");

    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (error || !session || session.user.id !== expectedId) {
      throw new Error("The account changed or the session expired. Please sign in again.");
    }
    // The verified access token is captured before the request, so an account
    // switch in another tab cannot send this password to the wrong user.
    const verified = await supabase.auth.getUser(session.access_token);
    if (verified.error || verified.data.user?.id !== expectedId) {
      throw new Error("The account could not be verified. Please sign in again.");
    }
    const currentLink = passwordLinkRef.current;
    const currentUser = stateRef.current.user;
    if (link.status === "ready"
      ? currentLink.status !== "ready" || currentLink.userId !== expectedId
      : currentUser?.provider !== "supabase" || currentUser.id !== expectedId) {
      throw new Error("The account changed. Please try again.");
    }
    await updatePasswordForToken(publicSupabaseConfig.url, publicSupabaseConfig.anonKey, session.access_token, password);
    setPasswordLink({ status: "none" });
  }, [supabase]);

  const signOut = useCallback(async () => {
    locationSync.invalidate();
    backendRequestRef.current += 1;
    authSyncRef.current += 1;
    setPasswordLink({ status: "none" });
    if (supabase) await supabase.auth.signOut();
    dispatch({ type: "SET_USER", user: null });
  }, [supabase, locationSync]);

  const apiPost = useCallback(
    async (path: string, payload: unknown): Promise<Record<string, unknown>> => {
      if (!isSupabaseConfigured) {
        throw new Error("This action requires configured Supabase credentials. Demo mode is active.");
      }
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in as an authorized user before calling the backend.");
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : `Request failed (${response.status}).`,
        );
      }
      return body;
    },
    [getAccessToken],
  );

  const callTripApi = useCallback(
    async (payload: TripActionInput) => {
      const parsed = tripActionSchema.safeParse(payload);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      return apiPost("/api/trips", parsed.data);
    },
    [apiPost],
  );

  const submitLocation = useCallback(
    async (payload: LocationInput) => {
      const parsed = locationPayloadSchema.safeParse(payload);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      return apiPost("/api/locations", parsed.data);
    },
    [apiPost],
  );

  const applyDemoUpdate = useCallback(
    (
      routeId: string,
      factory: (simulation: SimulationState, route: Route, now: number) => SimulationUpdate,
    ) => {
      const current = stateRef.current;
      const route = current.routes.find((item) => item.id === routeId);
      const simulation = current.simulations[routeId];
      if (!route || !simulation) return;
      const now = Date.now();
      dispatch({
        type: "APPLY_SIMULATION_UPDATE",
        routeId,
        update: factory(simulation, route, now),
      });
    },
    [],
  );

  const defaultRouteId = useCallback(
    (routeId?: string) => routeId ?? stateRef.current.selectedRouteId,
    [],
  );

  const startTrip = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation, route, now) =>
        startDemoTrip(simulation, route, now),
      ),
    [applyDemoUpdate, defaultRouteId],
  );

  const endTrip = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation, route, now) =>
        endDemoTrip(simulation, route, now),
      ),
    [applyDemoUpdate, defaultRouteId],
  );

  const setSharing = useCallback(
    (routeId: string, enabled: boolean) =>
      applyDemoUpdate(routeId, (simulation, route, now) =>
        setSharingSimulation(simulation, route, enabled, now),
      ),
    [applyDemoUpdate],
  );

  const togglePauseSimulation = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation) => togglePause(simulation)),
    [applyDemoUpdate, defaultRouteId],
  );

  const reset = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation, _route, now) =>
        resetSimulation(simulation, now),
      ),
    [applyDemoUpdate, defaultRouteId],
  );

  const injectDelaySimulation = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation, route, now) =>
        injectDelay(simulation, route, now),
      ),
    [applyDemoUpdate, defaultRouteId],
  );

  const simulateOffline = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation, route, now) =>
        setSimulationOffline(simulation, route, now),
      ),
    [applyDemoUpdate, defaultRouteId],
  );

  const resumeOffline = useCallback(
    (routeId?: string) =>
      applyDemoUpdate(defaultRouteId(routeId), (simulation, _route, now) =>
        resumeFromOffline(simulation, now),
      ),
    [applyDemoUpdate, defaultRouteId],
  );

  const executeAdminMutation = useCallback(
    async (mutation: AdminMutationPayload, localAction: () => void) => {
      const current = stateRef.current;
      if (current.user?.role !== "admin") {
        throw new Error("Administrator access is required for this change.");
      }
      if (isSupabaseConfigured && current.user?.provider === "supabase") {
        await apiPost("/api/admin", mutation);
        await refreshBackendData();
      } else {
        localAction();
      }
    },
    [apiPost, refreshBackendData],
  );

  const saveBus = useCallback(
    async (input: BusInput, id?: string) => {
      const parsed = busInputSchema.safeParse(input);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      const busId = id ?? makeId("bus");
      await executeAdminMutation(
        { resource: "buses", action: id ? "update" : "create", id: busId, data: parsed.data },
        () => dispatch({ type: "UPSERT_BUS", id: busId, isNew: !id, input: parsed.data }),
      );
    },
    [executeAdminMutation],
  );

  const deleteBus = useCallback(
    async (id: string) =>
      executeAdminMutation(
        { resource: "buses", action: "delete", id },
        () => dispatch({ type: "DELETE_BUS", id }),
      ),
    [executeAdminMutation],
  );

  const saveRoute = useCallback(
    async (input: RouteInputWithTemplate, id?: string) => {
      const { templateRouteId, ...routeFields } = input;
      const parsed = routeInputSchema.safeParse(routeFields);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      const routeId = id ?? makeId("route");
      await executeAdminMutation(
        {
          resource: "routes",
          action: id ? "update" : "create",
          id: routeId,
          data: { ...parsed.data, templateRouteId },
        },
        () =>
          dispatch({
            type: "UPSERT_ROUTE",
            id: routeId,
            isNew: !id,
            input: parsed.data,
            templateRouteId,
          }),
      );
    },
    [executeAdminMutation],
  );

  const deleteRoute = useCallback(
    async (id: string) =>
      executeAdminMutation(
        { resource: "routes", action: "delete", id },
        () => dispatch({ type: "DELETE_ROUTE", id }),
      ),
    [executeAdminMutation],
  );

  const saveStop = useCallback(
    async (routeId: string, input: StopInput, id?: string) => {
      const parsed = stopInputSchema.safeParse(input);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      const stopId = id ?? makeId("stop");
      await executeAdminMutation(
        {
          resource: "stops",
          action: id ? "update" : "create",
          id: stopId,
          data: { ...parsed.data, routeId },
        },
        () =>
          dispatch({
            type: "UPSERT_STOP",
            id: stopId,
            isNew: !id,
            routeId,
            input: parsed.data,
          }),
      );
    },
    [executeAdminMutation],
  );

  const deleteStop = useCallback(
    async (routeId: string, id: string) =>
      executeAdminMutation(
        { resource: "stops", action: "delete", id, data: { routeId } },
        () => dispatch({ type: "DELETE_STOP", routeId, id }),
      ),
    [executeAdminMutation],
  );

  const assignDriver = useCallback(
    async (busId: string, driverId: string | null) => {
      const parsed = driverAssignmentSchema.safeParse({ busId, driverId });
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      await executeAdminMutation(
        {
          resource: "driver-assignments",
          action: "update",
          id: busId,
          data: parsed.data,
        },
        () => dispatch({ type: "ASSIGN_DRIVER", busId, driverId }),
      );
    },
    [executeAdminMutation],
  );

  const endTripAsAdmin = useCallback(
    async (routeId: string) => {
      const current = stateRef.current;
      const bus = current.buses.find((item) => item.routeId === routeId);
      const simulation = current.simulations[routeId];
      const route = current.routes.find((item) => item.id === routeId);
      if (!route || !simulation) return;
      await executeAdminMutation(
        {
          resource: "trips",
          action: "end-trip",
          data: { routeId, busId: bus?.id },
        },
        () =>
          dispatch({
            type: "APPLY_SIMULATION_UPDATE",
            routeId,
            update: endDemoTrip(simulation, route, Date.now()),
          }),
      );
    },
    [executeAdminMutation],
  );

  const reportDelay = useCallback(
    async (input: DelayReportInput) => {
      const parsed = delayReportSchema.safeParse(input);
      if (!parsed.success) throw new Error(firstZodError(parsed.error));
      const current = stateRef.current;
      const route = current.routes.find((item) => item.id === parsed.data.routeId);
      const simulation = current.simulations[parsed.data.routeId];
      const now = Date.now();
      const event: SimulationEvent = {
        key: `admin-delay:${parsed.data.routeId}:${now}`,
        type: "delay",
        routeId: parsed.data.routeId,
        title: `Delay reported · ${route?.busNumber ?? "bus"}`,
        message: `${parsed.data.reason} (simulated administrative delay report).`,
        createdAt: now,
        delaySeconds: parsed.data.delaySeconds,
      };
      await executeAdminMutation(
        { resource: "delay-reports", action: "create", data: parsed.data },
        () => {
          if (simulation) {
            dispatch({
              type: "APPLY_SIMULATION_UPDATE",
              routeId: parsed.data.routeId,
              update: {
                state: {
                  ...simulation,
                  delaySeconds:
                    simulation.delaySeconds + parsed.data.delaySeconds,
                  lastUpdateAt: now,
                },
                events: [event],
              },
            });
          }
        },
      );
    },
    [executeAdminMutation],
  );

  const deleteDelayReport = useCallback(
    async (id: string) =>
      executeAdminMutation(
        { resource: "delay-reports", action: "delete", id },
        () => dispatch({ type: "DELETE_DELAY_REPORT", id }),
      ),
    [executeAdminMutation],
  );

  const setDemoRole = useCallback((role: UserRole) => {
    locationSync.invalidate();
    backendRequestRef.current += 1;
    authSyncRef.current += 1;
    setPasswordLink({ status: "none" });
    dispatch({ type: "SET_USER", user: { ...demoUsers[role] } });
    dispatch({ type: "SET_ERROR", error: null });
  }, [locationSync]);

  const selectRoute = useCallback((routeId: string) => {
    dispatch({ type: "SELECT_ROUTE", routeId });
  }, []);

  const selectStop = useCallback((stopId: string) => {
    dispatch({ type: "SELECT_STOP", stopId });
  }, []);

  const clearError = useCallback(() => dispatch({ type: "SET_ERROR", error: null }), []);
  const markRead = useCallback(
    (id: string) => {
      dispatch({ type: "MARK_READ", id });
      if (supabase && stateRef.current.user?.provider === "supabase" && UUID_PATTERN.test(id)) {
        void supabase.rpc("mark_notification_read", { p_notification_id: id }).then(({ error }) => {
          if (error) dispatch({ type: "SET_ERROR", error: error.message });
        });
      }
    },
    [supabase],
  );
  const markAllRead = useCallback(() => {
    const unreadBackendIds = stateRef.current.notifications
      .filter(
        (item) =>
          !item.readAt &&
          stateRef.current.user?.provider === "supabase" &&
          UUID_PATTERN.test(item.id),
      )
      .map((item) => item.id);
    dispatch({ type: "MARK_ALL_READ" });
    if (supabase) {
      unreadBackendIds.forEach((id) => {
        void supabase.rpc("mark_notification_read", { p_notification_id: id });
      });
    }
  }, [supabase]);
  const deleteNotification = useCallback(
    (id: string) => dispatch({ type: "DELETE_NOTIFICATION", id }),
    [],
  );
  const clearNotifications = useCallback(
    () => dispatch({ type: "CLEAR_NOTIFICATIONS" }),
    [],
  );

  const getRouteSnapshot = useCallback(
    (routeId: string, selectedStopId?: string) =>
      deriveRouteSnapshot(stateRef.current, routeId, selectedStopId),
    [],
  );

  const snapshot = useMemo(
    () => deriveRouteSnapshot(state, state.selectedRouteId),
    [state],
  );
  const unreadCount = useMemo(
    () => state.notifications.filter((item) => !item.readAt).length,
    [state.notifications],
  );

  const value: AppContextValue = {
    state,
    config: backendConfig,
    snapshot,
    unreadCount,
    pushPermission,
    getRouteSnapshot,
    selectRoute,
    selectStop,
    setDemoRole,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    passwordLink,
    signOut,
    getAccessToken,
    requestPushPermission,
    clearError,
    markRead,
    markAllRead,
    deleteNotification,
    clearNotifications,
    startTrip: startTrip as AppContextValue["startTrip"],
    endTrip,
    setSharing,
    togglePause: togglePauseSimulation,
    reset,
    injectDelay: injectDelaySimulation,
    simulateOffline,
    resumeOffline,
    callTripApi,
    submitLocation,
    refreshBackendData,
    saveBus,
    deleteBus,
    saveRoute,
    deleteRoute,
    saveStop,
    deleteStop,
    assignDriver,
    endTripAsAdmin,
    reportDelay,
    deleteDelayReport,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider.");
  }
  return context;
}

export type { AppContextValue, NotificationItem };
