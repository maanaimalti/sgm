import type * as React from "react";

import { ServiceWorkerRegistrar } from "@/components/pwa/sw-registrar";
import { AppShell } from "@/components/shell/app-shell";
import { AuthGate } from "@/components/shell/auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>
        <ServiceWorkerRegistrar />
        {children}
      </AppShell>
    </AuthGate>
  );
}
