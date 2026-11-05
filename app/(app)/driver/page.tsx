"use client";

import { RoleGuard } from "@/components/role-guard";
import { DriverDashboard } from "@/components/driver/driver-dashboard";

export default function DriverPage() {
  return (
    <RoleGuard
      allow={["driver"]}
      title="Driver login required"
      description="The driver dashboard can start trips and share device GPS only for an authorized, assigned driver."
    >
      <DriverDashboard />
    </RoleGuard>
  );
}
