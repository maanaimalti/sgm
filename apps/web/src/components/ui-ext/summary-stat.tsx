import type * as React from "react";

import { cn } from "@/lib/utils";

interface SummaryStatProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "bad" | "ok";
  className?: string;
}

const toneClass: Record<NonNullable<SummaryStatProps["tone"]>, string> = {
  default: "text-ink",
  warn: "text-warn-ink",
  bad: "text-bad-ink",
  ok: "text-ok-ink",
};

export function SummaryStat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: SummaryStatProps) {
  return (
    <div
      className={cn(
        "bg-card border border-line rounded-3 px-4 py-3 shadow-sm-warm",
        className,
      )}
    >
      <div className="text-[11.5px] uppercase tracking-[0.05em] text-muted font-medium">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div
          className={cn(
            "font-serif text-[28px] tracking-[-0.02em] leading-none",
            toneClass[tone],
          )}
        >
          {value}
        </div>
        {hint && <div className="text-[12.5px] text-muted">{hint}</div>}
      </div>
    </div>
  );
}
