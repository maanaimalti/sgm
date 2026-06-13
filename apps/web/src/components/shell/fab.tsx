"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

interface FabProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

export function Fab({ icon, label, onClick, className }: FabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed right-4 bottom-20 z-30 inline-flex items-center justify-center size-14 rounded-full bg-brand text-card shadow-lg-warm hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft",
        className,
      )}
    >
      {icon}
    </button>
  );
}
