import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 font-sans">
        <select
          ref={ref}
          className={twMerge(
            "w-full h-11 px-4 text-sm bg-bg-surface border border-border-soft rounded-xl text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat pr-10",
            error && "border-danger focus-visible:ring-danger",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-[12px] text-danger font-sans pl-1">{error}</span>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
