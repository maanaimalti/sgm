import { cn } from "@/lib/utils";

type Status = "ok" | "low" | "critical" | "out";

interface StockBarProps {
  qty: number;
  threshold: number;
  status: Status;
  className?: string;
}

const fillClasses: Record<Status, string> = {
  ok: "bg-ok",
  low: "bg-warn",
  critical: "bg-warn",
  out: "bg-bad",
};

export function StockBar({ qty, threshold, status, className }: StockBarProps) {
  const max = Math.max(threshold * 2, 1);
  const pct = Math.min(100, Math.max(0, (qty / max) * 100));
  return (
    <div
      className={cn(
        "relative w-full h-1.5 rounded-pill bg-soft overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full rounded-pill",
          fillClasses[status],
        )}
        style={{ width: `${pct}%` }}
      />
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 w-px bg-line-2"
        style={{ left: "50%" }}
      />
    </div>
  );
}
