import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", prefixText, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        <div className="relative flex items-center w-full">
          {prefixText && (
            <span className="absolute left-4 text-text-secondary text-sm font-sans select-none pointer-events-none">
              {prefixText}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            className={twMerge(
              "w-full h-11 px-4 text-sm bg-bg-surface border border-border-soft rounded-2xl text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all font-sans",
              prefixText && "pl-10",
              error && "border-danger focus-visible:ring-danger",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-[12px] text-danger font-sans pl-1">{error}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
