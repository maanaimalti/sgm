import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // 16px on mobile keeps iOS from auto-zooming on focus; 14px on >=md.
          "flex min-h-[88px] w-full rounded-2 border border-line-2 bg-card px-3 py-2 text-[16px] md:text-[14px] text-ink placeholder:text-muted focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
