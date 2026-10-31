import { fmt2, masteryColor } from "@/lib/utils";

/** Horizontal mastery bar coloured with masteryColor, with a tabular value. */
export function MasteryBar({ label, value, estimated = false }: { label: string; value: number; estimated?: boolean }) {
  const color = masteryColor(estimated ? null : value);
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{ width: `${Math.round(value * 100)}%`, background: color }}
        />
      </div>
      <span className="w-9 text-right font-mono text-xs tabular" style={{ color }}>
        {fmt2(value)}
      </span>
    </div>
  );
}
