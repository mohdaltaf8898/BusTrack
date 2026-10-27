import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-[340px] w-full items-center justify-center overflow-hidden rounded-3xl bg-[#eaf1f8] md:h-[440px]",
        className,
      )}
      aria-busy="true"
      aria-label="Loading route map"
    >
      <div className="map-grid absolute inset-0 opacity-80" />
      <Skeleton className="absolute left-[16%] top-[30%] h-2 w-[62%] rotate-[-12deg] rounded-full" />
      <Skeleton className="absolute left-[20%] top-[52%] h-2 w-[50%] rotate-[14deg] rounded-full" />
      <div className="relative rounded-2xl bg-white/90 px-4 py-2 text-xs font-semibold text-navy-700 shadow-card">
        Preparing route map…
      </div>
    </div>
  );
}
