"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  asChild?: boolean;
}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ active, count, children, className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill px-3 h-8 text-[12.5px] font-medium transition-all duration-150 ease-out border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft",
          active
            ? "bg-ink text-surface border-ink"
            : "bg-card text-ink-2 border-line-2 hover:bg-soft",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {typeof count === "number" && (
          <span
            className={cn(
              "px-1.5 rounded-pill text-[11px]",
              active ? "bg-white/15 text-surface" : "bg-soft text-muted",
            )}
          >
            {count}
          </span>
        )}
      </Comp>
    );
  },
);
FilterChip.displayName = "FilterChip";
