import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Cards that lead somewhere (links, selectable options) lift slightly on
   * hover. Pure CSS, so it must not be combined with a Motion-animated element
   * (Motion owns inline `transform`); wrap those in `RevealItem whileHover`.
   */
  interactive?: boolean;
  /**
   * `glass` is for cards that float over colour (auth screens, hero accents):
   * frosted backdrop, lit rim. Content cards on the plain canvas stay `solid`
   * so dense text keeps full contrast.
   */
  tone?: "solid" | "glass";
}

export function Card({ className, interactive = false, tone = "solid", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        tone === "glass" ? "glass-strong glass-edge" : "border border-slate-200 bg-white shadow-card",
        interactive &&
          "transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-base font-semibold tracking-tight text-navy-950", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm leading-6 text-slate-500", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3 border-t border-slate-100 p-4", className)}
      {...props}
    />
  );
}
