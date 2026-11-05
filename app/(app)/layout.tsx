import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";

export const metadata = {
  robots: { index: false, follow: false },
};

/** Signed-in workspace: dashboard, tracking, routes, alerts, driver and admin. */
export default function AppWorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
