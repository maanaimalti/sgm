"use client";

import type * as React from "react";

import { useIsMobile } from "@/hooks/use-is-mobile";

import { DesktopShell } from "./desktop-shell";
import { MobileShell } from "./mobile-shell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <MobileShell>{children}</MobileShell>
  ) : (
    <DesktopShell>{children}</DesktopShell>
  );
}
