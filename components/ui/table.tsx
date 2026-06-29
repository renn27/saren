import * as React from "react";
import { twMerge } from "tailwind-merge";

export const TableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={twMerge(
      "w-full overflow-x-auto rounded-3xl border border-border-soft bg-bg-surface [box-shadow:var(--shadow-card)]",
      className
    )}
    {...props}
  />
));
TableContainer.displayName = "TableContainer";

export const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={twMerge("w-full text-left border-collapse font-sans", className)}
    {...props}
  />
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={twMerge(
      "bg-bg-page/80 backdrop-blur-sm border-b border-border-soft sticky top-0 z-10",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={twMerge("divide-y divide-border-soft/60", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={twMerge(
      "transition-colors duration-100",
      "hover:bg-accent/[0.04]",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={twMerge(
      "px-4 py-3 sm:px-5 sm:py-3.5",
      "text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary",
      "font-sans select-none align-middle whitespace-nowrap",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={twMerge(
      "px-4 py-3 sm:px-5 sm:py-3.5 text-[13px] text-text-primary align-middle",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";
