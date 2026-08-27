import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { triggerHaptic } from "@/lib/utils/haptics";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "danger") {
        triggerHaptic("warning");
      } else {
        triggerHaptic("light");
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={twMerge(
          "inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 font-sans cursor-pointer",
          // Variants
          variant === "primary" &&
            "bg-accent text-white hover:bg-accent/90 shadow-sm hover:shadow-md hover:shadow-accent/20 rounded-2xl",
          variant === "secondary" &&
            "bg-accent-soft text-accent hover:bg-accent-soft/80 rounded-2xl",
          variant === "outline" &&
            "border border-border-soft bg-bg-surface text-text-primary hover:bg-accent-soft/40 hover:border-accent/30 hover:text-accent rounded-2xl",
          variant === "danger" &&
            "bg-danger text-white hover:bg-danger/90 shadow-sm hover:shadow-md hover:shadow-danger/20 rounded-2xl",
          variant === "ghost" &&
            "text-text-primary hover:bg-accent-soft/40 rounded-2xl",
          // Sizes
          size === "sm" && "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
          size === "md" && "h-11 px-5 text-sm gap-2 rounded-2xl",
          size === "lg" && "h-12 px-6 text-[15px] gap-2 rounded-2xl",
          size === "icon" && "h-9 w-9 p-0 rounded-xl",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
