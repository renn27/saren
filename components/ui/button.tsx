import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 font-sans cursor-pointer",
          // Variants
          variant === "primary" && "bg-accent text-white hover:bg-accent/90 rounded-xl",
          variant === "secondary" && "bg-accent-soft text-accent hover:bg-accent-soft/80 rounded-xl",
          variant === "outline" && "border border-border-soft text-text-primary hover:bg-accent-soft/30 rounded-xl",
          variant === "danger" && "bg-danger text-white hover:bg-danger/90 rounded-xl",
          variant === "ghost" && "text-text-primary hover:bg-accent-soft/40 rounded-xl",
          // Sizes
          size === "sm" && "h-9 px-3 text-[13px] rounded-lg",
          size === "md" && "h-11 px-5 text-sm rounded-xl",
          size === "lg" && "h-12 px-6 text-[15px] rounded-xl",
          size === "icon" && "h-9 w-9 p-0 rounded-lg",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
