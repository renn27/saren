import * as React from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";
import { X } from "lucide-react";
import { Button } from "./button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
  contentClassName?: string;
  hideHeader?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidthClassName,
  contentClassName,
  hideHeader = false,
}: DialogProps) {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);

  const prevContentRef = React.useRef({ title, description, children });
  if (isOpen) {
    prevContentRef.current = { title, description, children };
  }
  const displayContent = isOpen ? { title, description, children } : prevContentRef.current;

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200); // match modal-card-out duration
    }

    return () => clearTimeout(timeoutId);
  }, [isOpen, shouldRender]);

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
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={twMerge(
          "fixed inset-0 bg-text-primary/25 dark:bg-black/55 backdrop-blur-sm",
          isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        )}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={twMerge(
          "relative w-full max-w-lg bg-bg-surface border border-border-soft rounded-3xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden z-10 font-sans",
          maxWidthClassName,
          isClosing ? "animate-modal-card-out" : "animate-modal-card-in"
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-text-secondary hover:bg-accent-soft/50 transition-colors cursor-pointer z-20"
        >
          <X className="h-4 w-4" />
        </button>

        {!hideHeader && (
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
        )}

        <div className={twMerge("flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8 pt-0 min-h-0", hideHeader ? "p-4 sm:p-5" : "", contentClassName)}>
          {displayContent.children}
        </div>
      </div>
    </div>,
    document.body
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
  const [isClosing, setIsClosing] = React.useState(false);

  const prevContentRef = React.useRef({ title, description });
  if (isOpen) {
    prevContentRef.current = { title, description };
  }
  const displayContent = isOpen ? { title, description } : prevContentRef.current;

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200);
    }

    return () => clearTimeout(timeoutId);
  }, [isOpen, shouldRender]);

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
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={twMerge(
          "fixed inset-0 bg-text-primary/25 dark:bg-black/55 backdrop-blur-sm",
          isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        )}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={twMerge(
          "relative w-full max-w-md bg-bg-surface border border-border-soft rounded-3xl shadow-2xl p-6 md:p-8 z-10 font-sans",
          isClosing ? "animate-modal-card-out" : "animate-modal-card-in"
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
    </div>,
    document.body
  );
}
