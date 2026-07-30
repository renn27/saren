import { Skeleton } from "@/components/ui/skeleton";

export default function GarapanAplikasiDetailLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 py-4 sm:px-6 space-y-4">
      {/* Breadcrumb Skeleton */}
      <Skeleton className="h-9 w-48 rounded-xl" />

      {/* App Header Info Skeleton */}
      <div className="bg-bg-surface border border-border-soft p-5 rounded-3xl space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
          <Skeleton className="h-7 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>

      {/* Toolbar Controls Skeleton */}
      <div className="bg-bg-surface border border-border-soft p-4 rounded-3xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-bg-surface border border-border-soft rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-4 pb-3 border-b border-border-soft">
          <Skeleton className="h-6 w-28 rounded" />
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-6 w-32 rounded" />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-border-soft/40">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-5 w-28 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
