import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-[-0.005em] transition-all duration-150 ease-out whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft",
  {
    variants: {
      variant: {
        default: "bg-brand text-card border border-brand hover:bg-brand-ink",
        secondary:
          "bg-card text-ink border border-line-2 hover:bg-soft",
        outline:
          "bg-card text-ink border border-line-2 hover:bg-soft",
        ghost:
          "bg-transparent text-ink-2 hover:bg-soft border border-transparent",
        soft:
          "bg-brand-soft text-brand-ink border border-transparent hover:brightness-95",
        warning: "bg-warn text-card border border-warn",
        destructive: "bg-bad text-card border border-bad",
        dangerOutline:
          "bg-transparent text-bad-ink border border-bad-soft hover:bg-bad-soft",
        link: "bg-transparent text-brand underline-offset-4 hover:underline border border-transparent",
      },
      size: {
        default: "h-10 px-4 text-[14px]",
        sm: "h-8 px-3 text-[13px] gap-1.5",
        lg: "h-12 px-5 text-[15px] gap-2.5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
