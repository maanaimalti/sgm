import type { LucideIcon } from "lucide-react";
import type * as React from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="border border-dashed border-line-2 rounded-3 bg-card flex flex-col items-center text-center px-6 py-12">
      <span className="inline-flex items-center justify-center size-14 rounded-3 bg-soft text-muted mb-4">
        <Icon size={24} />
      </span>
      <h3 className="font-serif text-[20px] text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[13px] text-muted max-w-[360px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
