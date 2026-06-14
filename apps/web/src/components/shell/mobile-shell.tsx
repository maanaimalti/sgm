"use client";

import type * as React from "react";

import { Fab } from "./fab";
import { MobileBottomNav } from "./mobile-bottom-nav";
import {
  MobileShellProvider,
  useMobileShellState,
} from "./mobile-header-context";
import { MobileTopBar } from "./mobile-top-bar";

function MobileShellInner({ children }: { children: React.ReactNode }) {
  const ctx = useMobileShellState();
  const header = ctx?.header ?? {};
  const fab = ctx?.fab ?? null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface">
      {!header.hideTopBar && <MobileTopBar header={header} />}
      <main className="flex-1 px-4 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      {fab && <Fab icon={fab.icon} label={fab.label} onClick={fab.onClick} />}
      <MobileBottomNav />
    </div>
  );
}

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileShellProvider>
      <MobileShellInner>{children}</MobileShellInner>
    </MobileShellProvider>
  );
}
