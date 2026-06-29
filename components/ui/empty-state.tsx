import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-bg-surface border border-border-soft rounded-3xl [box-shadow:var(--shadow-card)] max-w-md mx-auto font-sans">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center mb-5 border border-accent/10 empty-float">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-[17px] font-bold text-text-primary mb-1.5 font-display tracking-tight">
        {title}
      </h3>
      <p className="text-[13px] text-text-secondary mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
