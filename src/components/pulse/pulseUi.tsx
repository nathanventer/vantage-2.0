import { TrendingDown, TrendingUp } from "lucide-react";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransportMode } from "@/types";

export const GRID = "color-mix(in oklab, var(--color-border) 100%, transparent)";
export const AXIS = "var(--color-muted-foreground)";

export const MODE_STYLE: Record<TransportMode, string> = {
  Sea: "bg-info/15 text-info border-info/30",
  Road: "bg-ok/15 text-ok border-ok/30",
  Air: "bg-warn/15 text-warn border-warn/30",
  Rail: "bg-muted/60 text-muted-foreground border-border",
};

export function ModeBadge({ mode, className }: { mode: TransportMode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        MODE_STYLE[mode],
        className,
      )}
    >
      {mode}
    </span>
  );
}

export function MoMChip({ pct, className }: { pct: number; className?: string }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        up ? "border-err-bd bg-err-bg text-err" : "border-ok-bd bg-ok-bg text-ok",
        className,
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
      {up ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

export function PulseChartTip({
  active,
  payload,
  label,
  valueLabel = "Median",
}: {
  active?: boolean;
  payload?: { value: number; name: string; dataKey: string }[];
  label?: string | number;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const primary = payload.find((p) => p.dataKey === "median" || p.dataKey === "avg") ?? payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center justify-between gap-6">
        <span className="text-xs text-muted-foreground">{valueLabel}</span>
        <span className="text-sm font-semibold tabular-nums">{formatZAR(primary?.value ?? 0)}</span>
      </div>
    </div>
  );
}
