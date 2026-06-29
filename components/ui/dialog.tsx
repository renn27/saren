import * as React from "react";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";
import { Button } from "./button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
}: DialogProps) {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const prevContentRef = React.useRef({ title, description, children });
  if (isOpen) {
    prevContentRef.current = { title, description, children };
  }
  const displayContent = isOpen ? { title, description, children } : prevContentRef.current;

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={twMerge(
          "fixed inset-0 bg-text-primary/20 backdrop-blur-sm transition-opacity duration-300 ease-out",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={twMerge(
          "relative w-full max-w-lg bg-bg-surface border border-border-soft rounded-3xl shadow-xl flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 font-sans",
          isAnimating
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-text-secondary hover:bg-accent-soft/50 transition-colors cursor-pointer z-10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-2 p-6 md:p-8 pb-4 md:pb-4 shrink-0 pr-12">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-text-primary font-display leading-tight">
            {displayContent.title}
          </h2>
          {displayContent.description && (
            <p className="text-[12px] sm:text-[13px] text-text-secondary leading-relaxed mt-0.5">
              {displayContent.description}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8 pt-0 min-h-0">
          {displayContent.children}
        </div>
      </div>
    </div>
  );
}

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Hapus",
  cancelText = "Batal",
  isDanger = true,
}: AlertDialogProps) {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const prevContentRef = React.useRef({ title, description });
  if (isOpen) {
    prevContentRef.current = { title, description };
  }
  const displayContent = isOpen ? { title, description } : prevContentRef.current;

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={twMerge(
          "fixed inset-0 bg-text-primary/20 backdrop-blur-sm transition-opacity duration-300 ease-out",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={twMerge(
          "relative w-full max-w-md bg-bg-surface border border-border-soft rounded-3xl shadow-xl p-6 md:p-8 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 font-sans",
          isAnimating
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        )}
      >
        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-[18px] font-semibold text-text-primary font-display">
            {displayContent.title}
          </h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {displayContent.description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
