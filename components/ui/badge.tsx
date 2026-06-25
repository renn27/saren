import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "accent" | "danger" | "success" | "circle";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={twMerge(
          "inline-flex items-center justify-center text-xs font-medium px-2.5 py-0.5 rounded-full font-sans select-none",
          variant === "primary" && "bg-accent-soft text-accent",
          variant === "secondary" && "bg-text-secondary/15 text-text-secondary border border-border-soft/60",
          variant === "accent" && "bg-accent-soft text-accent",
          variant === "danger" && "bg-danger-soft text-danger",
          variant === "success" && "bg-success/15 text-success",
          variant === "circle" && "h-5 w-5 p-0 bg-accent-soft text-accent text-[11px] rounded-full font-medium flex items-center justify-center font-sans",
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
