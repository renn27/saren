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
        "w-full text-left px-4 py-2.5 text-sm font-medium font-sans hover:bg-accent-soft hover:text-accent transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-text-secondary/60",
        isDanger && "hover:bg-danger-soft hover:text-danger text-danger",
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
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className={twMerge(
            "absolute z-30 mt-2 w-48 rounded-xl bg-bg-surface border border-border-soft shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 py-1",
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
