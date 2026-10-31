import { cn } from "@/lib/utils";

/** Styled shimmering-starfield placeholder shown while the 3D canvas loads (DESIGN.md §4.3). */
export function GalaxyLoading({ className, label = "Igniting galaxy…" }: { className?: string; label?: string }) {
  return (
    <div className={cn("starfield-loading absolute inset-0 flex items-center justify-center", className)} role="status">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
