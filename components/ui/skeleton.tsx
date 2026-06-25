import { twMerge } from "tailwind-merge";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge("animate-pulse rounded bg-border-soft/60", className)}
      {...props}
    />
  );
}
