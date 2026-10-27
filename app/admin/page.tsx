"use client";

import { RoleGuard } from "@/components/role-guard";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  return (
    <RoleGuard
      allow={["admin"]}
      title="Administrator login required"
      description="Buses, routes, stops, driver assignments and trip state are restricted. Sign in with an admin account or use the clearly labelled local demo admin role."
    >
      <AdminDashboard />
    </RoleGuard>
  );
}
