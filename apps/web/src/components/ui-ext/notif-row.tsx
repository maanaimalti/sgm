"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "bad" | "info";

interface NotifRowProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: string;
  ago: string;
  unread?: boolean;
  onClick?: () => void;
}

const toneClasses: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok-ink",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad-ink",
  info: "bg-brand-soft text-brand-ink",
};

export function NotifRow({
  icon: Icon,
  tone,
  title,
  body,
  ago,
  unread,
  onClick,
}: NotifRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-start gap-3 w-full text-left px-4 py-3 transition-colors hover:bg-soft focus-visible:outline-none focus-visible:bg-soft",
        unread && "bg-brand-soft/40",
      )}
    >
      {unread && (
        <span
          aria-hidden="true"
          className="absolute left-1 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-brand"
        />
      )}
      <span
        className={cn(
          "shrink-0 inline-flex items-center justify-center size-8 rounded-2",
          toneClasses[tone],
        )}
      >
        <Icon size={15} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink truncate">{title}</div>
        <div className="text-[12px] text-muted line-clamp-2">{body}</div>
        <div className="text-[11px] text-faint mt-0.5">{ago}</div>
      </div>
    </button>
  );
}
