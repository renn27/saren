import * as React from "react";
import { twMerge } from "tailwind-merge";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const [localChecked, setLocalChecked] = React.useState(checked || false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setLocalChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      setLocalChecked(isChecked);
      if (onCheckedChange) {
        onCheckedChange(isChecked);
      }
    };

    return (
      <label className={twMerge("inline-flex items-center gap-2 cursor-pointer font-sans select-none", className)}>
        <span className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            checked={localChecked}
            onChange={handleChange}
            className="sr-only peer"
            {...props}
          />
          <span
            className={twMerge(
              "h-5 w-5 rounded-md border border-border-soft bg-bg-surface flex items-center justify-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
              localChecked && "bg-accent border-accent text-white"
            )}
          >
            {localChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </span>
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
