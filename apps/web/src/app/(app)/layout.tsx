import type * as React from "react";

import { ServiceWorkerRegistrar } from "@/components/pwa/sw-registrar";
import { AppShell } from "@/components/shell/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <ServiceWorkerRegistrar />
      {children}
    </AppShell>
  );
}
