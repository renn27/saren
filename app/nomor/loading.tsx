import { Skeleton } from "@/components/ui/skeleton";

export default function NomorListLoading() {
  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8 space-y-4">
      {/* Header Skeleton */}
      <div className="bg-bg-surface border border-border-soft p-4 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-36 rounded-xl" />
            <Skeleton className="h-3.5 w-28 rounded" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-bg-surface border border-border-soft rounded-2xl overflow-hidden p-4 space-y-3">
        <div className="flex items-center gap-4 pb-2 border-b border-border-soft">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-5 w-24 rounded ml-auto" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-border-soft/40">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-20 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
