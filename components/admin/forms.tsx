"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { Bus, DemoDriver, Route } from "@/lib/types";
import type {
  BusInput,
  DelayReportInput,
  RouteInput,
  StopInput,
} from "@/lib/validation-types";
import {
  busInputSchema,
  delayReportSchema,
  driverAssignmentSchema,
  firstZodError,
  routeInputSchema,
  stopInputSchema,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { FieldError, FormGrid, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SimulatedTag } from "@/components/ui/labels";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "maintenance", label: "Maintenance" },
];

type Errors = Record<string, string | undefined>;

function zodErrors(error: unknown): { errors: Errors; message: string } {
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as import("zod").ZodError;
    const flattened = zodError.flatten().fieldErrors;
    const errors: Errors = {};
    for (const [key, value] of Object.entries(flattened)) {
      errors[key] = Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined;
    }
    return { errors, message: firstZodError(zodError) };
  }
  return { errors: {}, message: "Please check the form and try again." };
}

interface RouteOption {
  id: string;
  label: string;
}

function useFormDialogReset(open: boolean, reset: () => void, dependencies: unknown[]) {
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ...dependencies]);
}

export function BusFormDialog({
  open,
  onClose,
  onSubmit,
  routes,
  drivers,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: BusInput, id?: string) => Promise<void>;
  routes: Route[];
  drivers: DemoDriver[];
  editing: Bus | null;
}) {
  const initial = () => ({
    number: editing?.number ?? "",
    routeId: editing?.routeId ?? routes[0]?.id ?? "",
    driverId: editing?.driverId ?? "",
    capacity: editing?.capacity == null ? "" : String(editing.capacity),
    status: editing?.status ?? "scheduled",
    model: editing?.model ?? "Not specified",
    serviceAvailability: editing?.serviceAvailability ?? "",
  });
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useFormDialogReset(open, () => {
    setValues(initial());
    setErrors({});
    setMessage(null);
  }, [editing, routes]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = busInputSchema.safeParse({
      ...values,
      driverId: values.driverId || null,
    });
    if (!parsed.success) {
      const result = zodErrors(parsed.error);
      setErrors(result.errors);
      setMessage(result.message);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit(parsed.data, editing?.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the bus.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit bus" : "Add bus"}
      description="Bus numbers and assignments are validated before being saved."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="bus-form" loading={submitting}>
            {editing ? "Save changes" : "Add bus"}
          </Button>
        </>
      }
    >
      <form id="bus-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        <FormGrid>
          <div>
            <Label htmlFor="bus-number">Bus number</Label>
            <Input
              id="bus-number"
              value={values.number}
              onChange={(event) => setValues({ ...values, number: event.target.value })}
              placeholder="BT-04"
            />
            <FieldError message={errors.number} />
          </div>
          <div>
            <Label htmlFor="bus-route">Assigned route</Label>
            <Select
              id="bus-route"
              value={values.routeId}
              onChange={(event) => setValues({ ...values, routeId: event.target.value })}
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.code} · {route.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.routeId} />
          </div>
          <div>
            <Label htmlFor="bus-driver">Assigned driver</Label>
            <Select
              id="bus-driver"
              value={values.driverId}
              onChange={(event) => setValues({ ...values, driverId: event.target.value })}
            >
              <option value="">Unassigned</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.driverId} />
          </div>
          <div>
            <Label htmlFor="bus-capacity">Capacity (optional)</Label>
            <Input
              id="bus-capacity"
              type="number"
              min={1}
              max={120}
              value={values.capacity}
              onChange={(event) => setValues({ ...values, capacity: event.target.value })}
            />
            <FieldError message={errors.capacity} />
          </div>
          <div>
            <Label htmlFor="bus-status">Operating status</Label>
            <Select
              id="bus-status"
              value={values.status}
              onChange={(event) => setValues({ ...values, status: event.target.value as Bus["status"] })}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError message={errors.status} />
          </div>
          <div>
            <Label htmlFor="bus-model">Vehicle label</Label>
            <Input
              id="bus-model"
              value={values.model}
              onChange={(event) => setValues({ ...values, model: event.target.value })}
            />
            <FieldError message={errors.model} />
          </div>
        </FormGrid>
        <div>
          <Label htmlFor="bus-service">Service availability</Label>
          <Input
            id="bus-service"
            value={values.serviceAvailability}
            onChange={(event) =>
              setValues({ ...values, serviceAvailability: event.target.value })
            }
          />
          <FieldError message={errors.serviceAvailability} />
        </div>
      </form>
    </Dialog>
  );
}

export function RouteFormDialog({
  open,
  onClose,
  onSubmit,
  routes,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RouteInput & { templateRouteId?: string }, id?: string) => Promise<void>;
  routes: Route[];
  editing: Route | null;
}) {
  const initial = () => ({
    code: editing?.code ?? `R-${String.fromCharCode(65 + routes.length)}`,
    name: editing?.name ?? "",
    busNumber: editing?.busNumber ?? `BT-0${routes.length + 1}`,
    startLocation: editing?.startLocation ?? "",
    destination: editing?.destination ?? "",
    description: editing?.description ?? "",
    averageSpeedKmh: String(editing?.averageSpeedKmh ?? 26),
    estimatedDurationMinutes: String(editing?.estimatedDurationMinutes ?? 45),
    status: editing?.status ?? "scheduled",
    templateRouteId: routes[0]?.id ?? "",
  });
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useFormDialogReset(open, () => {
    setValues(initial());
    setErrors({});
    setMessage(null);
  }, [editing, routes]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const { templateRouteId, ...routeFields } = values;
    const parsed = routeInputSchema.safeParse(routeFields);
    if (!parsed.success) {
      const result = zodErrors(parsed.error);
      setErrors(result.errors);
      setMessage(result.message);
      return;
    }
    if (!editing && !templateRouteId) {
      setMessage("Select a template route to provide valid geometry.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit({ ...parsed.data, templateRouteId }, editing?.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the route.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit route" : "Add route"}
      description="Route metadata is separate from the ordered stop geometry."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="route-form" loading={submitting}>
            {editing ? "Save changes" : "Add route"}
          </Button>
        </>
      }
    >
      <form id="route-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        {!editing && (
          <Alert tone="info">
            <span className="inline-flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                A new demo route copies a template’s stop geometry rather than generating random coordinates. Edit the
                copied stops after creation.
              </span>
            </span>
          </Alert>
        )}
        <FormGrid>
          <div>
            <Label htmlFor="route-code">Route ID</Label>
            <Input
              id="route-code"
              value={values.code}
              onChange={(event) => setValues({ ...values, code: event.target.value })}
              placeholder="R-D"
            />
            <FieldError message={errors.code} />
          </div>
          <div>
            <Label htmlFor="route-bus-number">Bus number</Label>
            <Input
              id="route-bus-number"
              value={values.busNumber}
              onChange={(event) => setValues({ ...values, busNumber: event.target.value })}
              placeholder="BT-04"
            />
            <FieldError message={errors.busNumber} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="route-name">Route name</Label>
            <Input
              id="route-name"
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              placeholder="Gandipet → Ameerpet"
            />
            <FieldError message={errors.name} />
          </div>
          <div>
            <Label htmlFor="route-start">Starting point</Label>
            <Input
              id="route-start"
              value={values.startLocation}
              onChange={(event) => setValues({ ...values, startLocation: event.target.value })}
              placeholder="LIET Main Gate"
            />
            <FieldError message={errors.startLocation} />
          </div>
          <div>
            <Label htmlFor="route-destination">Destination</Label>
            <Input
              id="route-destination"
              value={values.destination}
              onChange={(event) => setValues({ ...values, destination: event.target.value })}
              placeholder="Ameerpet"
            />
            <FieldError message={errors.destination} />
          </div>
          <div>
            <Label htmlFor="route-speed">Average demo speed (km/h)</Label>
            <Input
              id="route-speed"
              type="number"
              min={5}
              max={80}
              value={values.averageSpeedKmh}
              onChange={(event) => setValues({ ...values, averageSpeedKmh: event.target.value })}
            />
            <FieldError message={errors.averageSpeedKmh} />
          </div>
          <div>
            <Label htmlFor="route-duration">Estimated duration (min)</Label>
            <Input
              id="route-duration"
              type="number"
              min={5}
              max={300}
              value={values.estimatedDurationMinutes}
              onChange={(event) =>
                setValues({ ...values, estimatedDurationMinutes: event.target.value })
              }
            />
            <FieldError message={errors.estimatedDurationMinutes} />
          </div>
          <div>
            <Label htmlFor="route-status">Operating status</Label>
            <Select
              id="route-status"
              value={values.status}
              onChange={(event) => setValues({ ...values, status: event.target.value as Route["status"] })}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError message={errors.status} />
          </div>
          {!editing && (
            <div>
              <Label htmlFor="route-template">Geometry template</Label>
              <Select
                id="route-template"
                value={values.templateRouteId}
                onChange={(event) => setValues({ ...values, templateRouteId: event.target.value })}
              >
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.code} · {route.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </FormGrid>
        <div>
          <Label htmlFor="route-description">Description</Label>
          <Textarea
            id="route-description"
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            placeholder="Short corridor description"
          />
          <FieldError message={errors.description} />
        </div>
      </form>
    </Dialog>
  );
}

export function StopFormDialog({
  open,
  onClose,
  onSubmit,
  routes,
  defaultRouteId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (routeId: string, values: StopInput, id?: string) => Promise<void>;
  routes: Route[];
  defaultRouteId: string;
  editing: { id: string; routeId: string; stop: Route["stops"][number] } | null;
}) {
  const initial = () => ({
    routeId: editing?.routeId ?? defaultRouteId,
    name: editing?.stop.name ?? "",
    lat: editing?.stop.lat == null ? "" : String(editing.stop.lat),
    lng: editing?.stop.lng == null ? "" : String(editing.stop.lng),
    order: String(editing?.stop.order ?? (routes.find((route) => route.id === defaultRouteId)?.stops.length ?? 0) + 1),
  });
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useFormDialogReset(open, () => {
    setValues(initial());
    setErrors({});
    setMessage(null);
  }, [editing, defaultRouteId, routes]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = stopInputSchema.safeParse(values);
    if (!parsed.success) {
      const result = zodErrors(parsed.error);
      setErrors(result.errors);
      setMessage(result.message);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit(values.routeId, parsed.data, editing?.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the stop.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit stop" : "Add stop"}
      description="Coordinates are validated. Saving rebuilds a simple stop-to-stop demo polyline."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="stop-form" loading={submitting}>
            {editing ? "Save changes" : "Add stop"}
          </Button>
        </>
      }
    >
      <form id="stop-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        <Alert tone="warning">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Use plausible coordinates near the existing corridor. Straight-line stop links replace detailed road
              shape points after an edit.
            </span>
          </span>
        </Alert>
        <FormGrid>
          <div>
            <Label htmlFor="stop-route">Route</Label>
            <Select
              id="stop-route"
              value={values.routeId}
              onChange={(event) => setValues({ ...values, routeId: event.target.value })}
              disabled={Boolean(editing)}
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.code} · {route.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.routeId} />
          </div>
          <div>
            <Label htmlFor="stop-name">Stop name</Label>
            <Input
              id="stop-name"
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              placeholder="New stop"
            />
            <FieldError message={errors.name} />
          </div>
          <div>
            <Label htmlFor="stop-lat">Latitude</Label>
            <Input
              id="stop-lat"
              type="number"
              step="0.000001"
              value={values.lat}
              onChange={(event) => setValues({ ...values, lat: event.target.value })}
            />
            <FieldError message={errors.lat} />
          </div>
          <div>
            <Label htmlFor="stop-lng">Longitude</Label>
            <Input
              id="stop-lng"
              type="number"
              step="0.000001"
              value={values.lng}
              onChange={(event) => setValues({ ...values, lng: event.target.value })}
            />
            <FieldError message={errors.lng} />
          </div>
          <div>
            <Label htmlFor="stop-order">Stop order</Label>
            <Input
              id="stop-order"
              type="number"
              min={1}
              max={100}
              value={values.order}
              onChange={(event) => setValues({ ...values, order: event.target.value })}
            />
            <FieldError message={errors.order} />
          </div>
        </FormGrid>
      </form>
    </Dialog>
  );
}

export function DriverAssignmentDialog({
  open,
  onClose,
  onSubmit,
  bus,
  route,
  drivers,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (busId: string, driverId: string | null) => Promise<void>;
  bus: Bus | null;
  route?: Route;
  drivers: DemoDriver[];
}) {
  const [driverId, setDriverId] = useState(bus?.driverId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useFormDialogReset(open, () => {
    setDriverId(bus?.driverId ?? "");
    setMessage(null);
  }, [bus]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!bus) return;
    const parsed = driverAssignmentSchema.safeParse({
      busId: bus.id,
      driverId: driverId || null,
    });
    if (!parsed.success) {
      setMessage(firstZodError(parsed.error));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(bus.id, parsed.data.driverId);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Driver assignment"
      description={bus ? `${bus.number} · ${route?.name ?? "Unassigned route"}` : "Select a bus first."}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="assignment-form" loading={submitting}>
            Save assignment
          </Button>
        </>
      }
    >
      <form id="assignment-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        <div>
          <Label htmlFor="assignment-driver">Assigned driver</Label>
          <Select
            id="assignment-driver"
            value={driverId}
            onChange={(event) => setDriverId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name} · {driver.email}
              </option>
            ))}
          </Select>
        </div>
        <Alert tone="info">
          In Supabase mode this writes the assignment through a server-authorized admin API. Students never receive
          write access.
        </Alert>
      </form>
    </Dialog>
  );
}

export function DelayReportDialog({
  open,
  onClose,
  onSubmit,
  routes,
  buses,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DelayReportInput) => Promise<void>;
  routes: Route[];
  buses: Bus[];
}) {
  const firstRoute = routes[0];
  const firstBus = buses.find((bus) => bus.routeId === firstRoute?.id) ?? buses[0];
  const initial = () => ({
    routeId: firstRoute?.id ?? "",
    busId: firstBus?.id ?? "",
    delaySeconds: "300",
    reason: "Simulated traffic congestion",
  });
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useFormDialogReset(open, () => {
    setValues(initial());
    setErrors({});
    setMessage(null);
  }, [routes, buses]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = delayReportSchema.safeParse(values);
    if (!parsed.success) {
      const result = zodErrors(parsed.error);
      setErrors(result.errors);
      setMessage(result.message);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the delay report.");
    } finally {
      setSubmitting(false);
    }
  };

  const busesForRoute = buses.filter((bus) => bus.routeId === values.routeId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Report delay"
      description="Create a delay report and a non-duplicate in-app alert for the selected route."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="delay-form" loading={submitting}>
            Create report
          </Button>
        </>
      }
    >
      <form id="delay-form" onSubmit={(event) => void submit(event)} className="space-y-4">
        {message && <Alert tone="error">{message}</Alert>}
        <div className="flex items-center gap-2">
          <SimulatedTag label="Demo report" />
          <span className="text-xs text-slate-500">ETAs are estimates, not exact predictions.</span>
        </div>
        <FormGrid>
          <div>
            <Label htmlFor="delay-route">Route</Label>
            <Select
              id="delay-route"
              value={values.routeId}
              onChange={(event) => {
                const routeId = event.target.value;
                const bus = buses.find((item) => item.routeId === routeId);
                setValues({ ...values, routeId, busId: bus?.id ?? "" });
              }}
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.code} · {route.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.routeId} />
          </div>
          <div>
            <Label htmlFor="delay-bus">Bus</Label>
            <Select
              id="delay-bus"
              value={values.busId}
              onChange={(event) => setValues({ ...values, busId: event.target.value })}
            >
              {busesForRoute.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.number}
                </option>
              ))}
            </Select>
            <FieldError message={errors.busId} />
          </div>
          <div>
            <Label htmlFor="delay-seconds">Delay (seconds)</Label>
            <Input
              id="delay-seconds"
              type="number"
              min={30}
              max={7200}
              step={30}
              value={values.delaySeconds}
              onChange={(event) => setValues({ ...values, delaySeconds: event.target.value })}
            />
            <FieldError message={errors.delaySeconds} />
          </div>
          <div>
            <Label htmlFor="delay-reason">Reason</Label>
            <Input
              id="delay-reason"
              value={values.reason}
              onChange={(event) => setValues({ ...values, reason: event.target.value })}
            />
            <FieldError message={errors.reason} />
          </div>
        </FormGrid>
      </form>
    </Dialog>
  );
}

export type { RouteOption };
