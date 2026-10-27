import type { z } from "zod";
import type {
  adminMutationSchema,
  adminResourceSchema,
  busInputSchema,
  delayReportSchema,
  driverAssignmentSchema,
  locationPayloadSchema,
  routeInputSchema,
  stopInputSchema,
  tripActionSchema,
} from "@/lib/validation";

export type BusInput = z.infer<typeof busInputSchema>;
export type RouteInput = z.infer<typeof routeInputSchema>;
export type StopInput = z.infer<typeof stopInputSchema>;
export type LocationInput = z.infer<typeof locationPayloadSchema>;
export type TripActionInput = z.infer<typeof tripActionSchema>;
export type DriverAssignmentInput = z.infer<typeof driverAssignmentSchema>;
export type DelayReportInput = z.infer<typeof delayReportSchema>;
export type AdminMutationPayload = z.infer<typeof adminMutationSchema>;
export type AdminResource = z.infer<typeof adminResourceSchema>;
