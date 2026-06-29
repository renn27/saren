import * as React from "react";
import { twMerge } from "tailwind-merge";

export interface DropdownMenuItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  isDanger?: boolean;
  disabled?: boolean;
}

export function DropdownMenuItem({
  onClick,
  children,
  className,
  isDanger = false,
  disabled = false,
}: DropdownMenuItemProps) {
  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      className={twMerge(
        "w-full text-left px-3.5 py-2.5 text-sm font-medium font-sans transition-all duration-150 flex items-center gap-2.5 first:rounded-t-xl last:rounded-b-xl cursor-pointer",
        "text-text-primary hover:bg-accent-soft hover:text-accent",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text-secondary",
        isDanger && "text-danger hover:bg-danger-soft hover:text-danger",
        className
      )}
    >
      {children}
    </button>
  );
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Open / close with animation
  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const t = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(t);
    } else {
      setIsAnimating(false);
      const t = setTimeout(() => setShouldRender(false), 180);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {shouldRender && (
        <div
          onClick={() => setIsOpen(false)}
          className={twMerge(
            "absolute z-30 mt-2 w-36 rounded-xl bg-bg-surface border border-border-soft py-1",
            "[box-shadow:0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]",
            "transition-all duration-[180ms] ease-out origin-top",
            isAnimating
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-1 scale-95",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
