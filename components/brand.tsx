import Link from "next/link";
import { BusFront } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-navy-950",
        className,
      )}
    >
      <BusFront className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

export function Logo({
  className,
  compact = false,
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  href?: string | null;
}) {
  const content = (
    <>
      <span className="relative inline-flex">
        <BrandMark />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[17px] font-semibold tracking-tight text-navy-950">
            BusTrack
          </span>
          <span className="block text-xs font-normal text-slate-600">
            Know before you go
          </span>
        </span>
      )}
    </>
  );
  if (!href) return <div className={cn("flex items-center gap-2.5", className)}>{content}</div>;
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="BusTrack home">
      {content}
    </Link>
  );
}
