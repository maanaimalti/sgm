import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

export function Timeline({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

interface TimelineItemProps {
  dot: React.ReactNode;
  title: string;
  desc: string;
  current?: boolean;
}

export function TimelineItem({ dot, title, desc, current }: TimelineItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0">{dot}</div>
      <div>
        <div
          className={cn(
            "text-[13.5px] text-ink",
            current ? "font-semibold" : "font-medium",
          )}
        >
          {title}
        </div>
        <div className="text-[12.5px] text-muted mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

type TimelineTone = "ok" | "warn" | "bad" | "sage" | "info";

interface TimelineDotProps {
  tone: TimelineTone;
  icon: LucideIcon;
}

const toneClasses: Record<TimelineTone, string> = {
  ok: "bg-ok-soft text-ok-ink",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad-ink",
  sage: "bg-brand-soft text-brand-ink",
  info: "bg-brand-soft text-brand-ink",
};

export function TimelineDot({ tone, icon: Icon }: TimelineDotProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center size-[26px] rounded-full",
        toneClasses[tone],
      )}
    >
      <Icon size={13} />
    </span>
  );
}
