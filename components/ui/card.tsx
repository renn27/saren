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
          "bg-bg-surface border border-border-soft rounded-2xl p-6 shadow-sm font-sans transition-all duration-200",
          hoverable && "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md hover:shadow-accent/5 cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
