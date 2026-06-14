import { AlertTriangle } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  variant?: "plain" | "warning";
  className?: string;
}

export function StickyActionBar({
  left,
  right,
  variant = "plain",
  className,
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        // On mobile the fixed bottom nav (h-16 + safe area) owns the very
        // bottom, so the action bar sits just above it; flush on desktop.
        "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-10 bg-card border-t border-line shadow-md-warm px-4 md:px-6 py-3 flex items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {variant === "warning" && (
          <AlertTriangle size={16} className="text-warn shrink-0" />
        )}
        {left}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}
