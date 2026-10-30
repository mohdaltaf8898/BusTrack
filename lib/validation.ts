import { z } from "zod";

export const roleSchema = z.enum(["student", "driver", "admin"]);
export const routeStatusSchema = z.enum(["active", "scheduled", "maintenance"]);
export const latitudeSchema = z.number().finite().min(-90).max(90);
export const longitudeSchema = z.number().finite().min(-180).max(180);

export const locationPayloadSchema = z
  .object({
    busId: z.string().trim().min(1).max(80),
    tripId: z.string().uuid(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    heading: z.number().min(0).max(360).nullable().optional(),
    speedKmh: z.number().min(0).max(160).nullable().optional(),
    accuracyMeters: z.number().min(0).max(1000).nullable().optional(),
    recordedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type LocationPayload = z.infer<typeof locationPayloadSchema>;

export const tripActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), busId: z.string().min(1), routeId: z.string().min(1) }),
  z.object({ action: z.literal("end"), tripId: z.string().uuid() }),
  z.object({
    action: z.literal("share"),
    tripId: z.string().uuid(),
    enabled: z.boolean(),
  }),
]);

export type TripActionPayload = z.infer<typeof tripActionSchema>;

export const busInputSchema = z
  .object({
    number: z.string().trim().min(2, "Enter a bus number.").max(24),
    routeId: z.string().trim().min(1, "Select a route."),
    driverId: z.string().trim().nullable(),
    capacity: z.preprocess(
      (value) => value === "" || value == null ? null : value,
      z.coerce.number()
        .int("Capacity must be a whole number.")
        .min(1, "Capacity must be at least 1.")
        .max(120, "Capacity cannot exceed 120.")
        .nullable(),
    ),
    status: routeStatusSchema,
    model: z.string().trim().min(2).max(100),
    serviceAvailability: z.string().trim().max(180).optional().default(""),
  })
  .strict();

export const routeInputSchema = z
  .object({
    code: z.string().trim().min(1, "Enter a route ID.").max(12),
    name: z.string().trim().min(3, "Enter a route name.").max(100),
    busNumber: z.string().trim().min(2).max(24),
    startLocation: z.string().trim().min(2).max(120),
    destination: z.string().trim().min(2).max(120),
    description: z.string().trim().max(240).optional().default(""),
    averageSpeedKmh: z.coerce
      .number()
      .min(5, "Speed must be at least 5 km/h.")
      .max(80, "Speed cannot exceed 80 km/h."),
    estimatedDurationMinutes: z.coerce
      .number()
      .int()
      .min(5, "Duration must be at least 5 minutes.")
      .max(300, "Duration cannot exceed 300 minutes."),
    status: routeStatusSchema,
  })
  .strict();

export const stopInputSchema = z
  .object({
    routeId: z.string().trim().min(1, "Select a route."),
    name: z.string().trim().min(2, "Enter a stop name.").max(100),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    order: z.coerce
      .number()
      .int("Stop order must be a whole number.")
      .min(1)
      .max(100),
  })
  .strict();

export const driverAssignmentSchema = z
  .object({
    busId: z.string().trim().min(1),
    driverId: z.string().trim().nullable(),
  })
  .strict();

export const delayReportSchema = z
  .object({
    routeId: z.string().trim().min(1),
    busId: z.string().trim().min(1),
    delaySeconds: z.coerce.number().int().min(30).max(7200),
    reason: z.string().trim().min(3, "Enter a short reason.").max(180),
  })
  .strict();

export const adminResourceSchema = z.enum([
  "buses",
  "routes",
  "stops",
  "driver-assignments",
  "trips",
  "delay-reports",
]);

export type AdminResource = z.infer<typeof adminResourceSchema>;

export const adminMutationSchema = z
  .object({
    resource: adminResourceSchema,
    action: z.enum(["create", "update", "delete", "end-trip"]),
    id: z.string().trim().min(1).max(120).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type AdminMutationPayload = z.infer<typeof adminMutationSchema>;

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
