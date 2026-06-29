import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          "bg-bg-surface border border-border-soft rounded-3xl p-6 font-sans transition-all duration-200 ease-out",
          // Base shadow using CSS var
          "[box-shadow:var(--shadow-card)]",
          hoverable && [
            "cursor-pointer select-none",
            "hover:-translate-y-0.5 hover:border-accent/35",
            "hover:[box-shadow:var(--shadow-card-hover)]",
            "active:translate-y-0 active:scale-[0.99] active:[box-shadow:var(--shadow-card)]",
          ].join(" "),
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
