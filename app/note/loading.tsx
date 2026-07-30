import { Skeleton } from "@/components/ui/skeleton";

export default function NoteLoading() {
  return (
    <div className="max-w-6xl w-full mx-auto px-4 py-5 sm:px-6 sm:py-8 space-y-4">
      {/* Search Input Skeleton */}
      <Skeleton className="h-11 w-full max-w-xl mx-auto rounded-2xl" />

      {/* Grid Notes Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-bg-surface border border-border-soft p-4 rounded-2xl space-y-3 min-h-[140px] flex flex-col justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-soft/40">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
