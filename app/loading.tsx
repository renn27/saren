import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8 space-y-4">
      {/* Header Card Skeleton */}
      <div className="bg-bg-surface border border-border-soft p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-36 rounded-xl" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Grid Month Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-bg-surface border border-border-soft p-4 rounded-2xl flex items-center justify-between min-h-[76px]">
            <div className="flex items-center gap-3.5 flex-1">
              <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-5 w-24 rounded-lg" />
                <Skeleton className="h-3.5 w-12 rounded" />
              </div>
            </div>
            <Skeleton className="h-6 w-6 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
