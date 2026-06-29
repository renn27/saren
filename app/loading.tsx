export default function Loading() {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-14 w-14 rounded-2xl bg-bg-surface border border-border-soft flex items-center justify-center shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-accent/5 animate-pulse"></div>
          <img
             src="/saren_logo_dark.png"
             alt="Loading"
             className="h-9 w-9 object-cover opacity-70 animate-pulse"
          />
        </div>
      </div>
    </div>
  );
}
