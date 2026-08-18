import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, title, ...props }, ref) => {
    const [localChecked, setLocalChecked] = React.useState(checked);

    React.useEffect(() => {
      setLocalChecked(checked);
    }, [checked]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      const nextChecked = !localChecked;
      setLocalChecked(nextChecked);
      onCheckedChange?.(nextChecked);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={localChecked}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        title={title}
        className={twMerge(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          localChecked
            ? "bg-accent"
            : "bg-border-soft dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
          className
        )}
        {...props}
      >
        <span
          className={twMerge(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out",
            localChecked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";
