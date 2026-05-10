import type * as React from "react";

import { Sidebar } from "@/components/sidebar";

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-surface">
      <aside className="w-[244px] flex-shrink-0 border-r border-line sticky top-0 h-screen overflow-hidden">
        <Sidebar />
      </aside>
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
