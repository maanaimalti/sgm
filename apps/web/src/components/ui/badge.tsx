import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11.5px] font-medium tracking-[0.005em]",
  {
    variants: {
      variant: {
        default: "bg-soft text-ink-2",
        secondary: "bg-brand-soft text-brand-ink",
        success: "bg-ok-soft text-ok-ink",
        warning: "bg-warn-soft text-warn-ink",
        destructive: "bg-bad-soft text-bad-ink",
        outline: "bg-transparent border border-line-2 text-ink-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current mr-1.5"
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
