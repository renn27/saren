import { twMerge } from "tailwind-merge";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge("animate-shimmer rounded bg-bg-surface border border-border-soft/30", className)}
      {...props}
    />
  );
}
