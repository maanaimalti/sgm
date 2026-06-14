import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 16px on mobile keeps iOS from auto-zooming on focus; 14px on >=md.
          "h-11 w-full rounded-2 border border-line-2 bg-card px-3 text-[16px] md:text-[14px] text-ink placeholder:text-muted focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export interface InputGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  suffix?: string;
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, leading, trailing, suffix, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 h-11 rounded-2 border border-line-2 bg-card px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft transition-shadow",
          className,
        )}
        {...props}
      >
        {leading && (
          <span className="flex items-center text-muted shrink-0">
            {leading}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {/* Strip border/height from inner Input via override classes */}
          <div className="[&_input]:h-full [&_input]:w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:focus-visible:ring-0 [&_input]:focus-visible:border-0 [&_input]:rounded-none [&_input]:outline-none">
            {children}
          </div>
        </div>
        {suffix && (
          <span className="text-[12.5px] text-muted shrink-0">{suffix}</span>
        )}
        {trailing && (
          <span className="flex items-center text-muted shrink-0">
            {trailing}
          </span>
        )}
      </div>
    );
  },
);
InputGroup.displayName = "InputGroup";

export { Input, InputGroup };
