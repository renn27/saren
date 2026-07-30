import { Skeleton } from "@/components/ui/skeleton";

export default function GarapanDetailLoading() {
  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8 space-y-4">
      {/* Header Card Skeleton */}
      <div className="bg-bg-surface border border-border-soft p-4 rounded-3xl flex flex-col gap-3">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-bg-surface border border-border-soft p-4 rounded-2xl flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-28 rounded-lg" />
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
