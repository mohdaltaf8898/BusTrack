import { cn } from "@/lib/utils";

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-[340px] w-full items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-map-surface)] md:h-[440px]",
        className,
      )}
      aria-busy="true"
      aria-label="Loading route map"
    >
      <div className="relative rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-navy-700">
        Preparing route map…
      </div>
    </div>
  );
}
