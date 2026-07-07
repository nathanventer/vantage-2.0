import type { ReactNode } from "react";
import type { DotProps } from "recharts";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LaneSupplierPoint, LaneTrendPoint } from "@/lib/pulse";

/** Pulse chart palette — TradingView-inspired on Vantage dark tokens. */
export const PULSE = {
  grid: "color-mix(in oklab, var(--color-border) 35%, transparent)",
  gridStrong: "color-mix(in oklab, var(--color-border) 55%, transparent)",
  axis: "var(--color-muted-foreground)",
  /** Crisp foreground line (reference: white on dark). */
  line: "rgba(255, 255, 255, 0.9)",
  lineMuted: "rgba(255, 255, 255, 0.45)",
  brand: "#4a80ff",
  brandDeep: "#6e5bf2",
  ok: "#22c55e",
  okGlow: "rgba(34, 197, 94, 0.35)",
  warn: "#fbbf24",
  cursor: "color-mix(in oklab, var(--color-muted-foreground) 70%, transparent)",
  chartWell: "#0a0e16",
} as const;

export function PulseChartDefs({ id }: { id: string }) {
  const prefix = id;
  return (
    <defs>
      <linearGradient id={`${prefix}-mountain`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.14} />
        <stop offset="45%" stopColor="#ffffff" stopOpacity={0.05} />
        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${prefix}-mountainBrand`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PULSE.brand} stopOpacity={0.22} />
        <stop offset="55%" stopColor={PULSE.brandDeep} stopOpacity={0.06} />
        <stop offset="100%" stopColor={PULSE.brandDeep} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${prefix}-barOk`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PULSE.ok} stopOpacity={1} />
        <stop offset="100%" stopColor={PULSE.ok} stopOpacity={0.45} />
      </linearGradient>
      <linearGradient id={`${prefix}-barBrand`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PULSE.brand} stopOpacity={1} />
        <stop offset="100%" stopColor={PULSE.brandDeep} stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id={`${prefix}-barWarn`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={PULSE.warn} stopOpacity={1} />
        <stop offset="100%" stopColor={PULSE.warn} stopOpacity={0.45} />
      </linearGradient>
      <filter id={`${prefix}-glow`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function PulseActiveDot({ cx, cy }: DotProps) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="#ffffff" opacity={0.08} />
      <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke={PULSE.chartWell} strokeWidth={2} />
    </g>
  );
}

/** Terminal “current price” marker — green glow dot at series end. */
export function PulseTerminalDot({ cx, cy }: DotProps) {
  if (cx == null || cy == null) return null;
  return (
    <g filter="url(#pulse-terminal-glow)">
      <circle cx={cx} cy={cy} r={12} fill={PULSE.ok} opacity={0.2} />
      <circle cx={cx} cy={cy} r={5} fill={PULSE.ok} stroke={PULSE.chartWell} strokeWidth={2.5} />
    </g>
  );
}

export function PulseTerminalGlowDef() {
  return (
    <defs>
      <filter id="pulse-terminal-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function supplierBarGradientId(
  priceZAR: number,
  median: number,
  prefix: string,
): string {
  if (priceZAR <= median) return `url(#${prefix}-barOk)`;
  if (priceZAR <= median * 1.08) return `url(#${prefix}-barBrand)`;
  return `url(#${prefix}-barWarn)`;
}

/** Solid fills — reliable on dark chart wells (gradient url() can render invisible). */
export function supplierBarFill(priceZAR: number, median: number): string {
  if (priceZAR <= median) return PULSE.ok;
  if (priceZAR <= median * 1.08) return PULSE.brand;
  return PULSE.warn;
}

export function truncateProvider(name: string, max = 16): string {
  if (name.length <= max) return name;
  const first = name.split(/\s+/)[0] ?? name;
  return first.length <= max ? first : `${name.slice(0, max - 1)}…`;
}

type TrendTipProps = {
  active?: boolean;
  label?: string | number;
  payload?: { payload: { median: number; low: number; high: number; samples: number } }[];
};

export function PulseTrendTooltip({ active, label, payload }: TrendTipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="min-w-[9.5rem] rounded-lg border border-border/60 bg-[#12161f]/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold tabular-nums tracking-tight text-foreground">
        {formatZAR(row.median)}
      </p>
      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
        {formatZAR(row.low)} – {formatZAR(row.high)} · {row.samples} quotes
      </p>
    </div>
  );
}

type SupplierTipProps = {
  active?: boolean;
  label?: string | number;
  payload?: {
    payload: { priceZAR: number; samples: number; vsMedianPct: number; provider: string };
  }[];
};

export function PulseSupplierTooltip({ active, label, payload }: SupplierTipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const favorable = row.vsMedianPct <= 0;
  return (
    <div className="min-w-[12rem] rounded-2xl border border-brand/20 bg-popover/95 px-3.5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <p className="max-w-[200px] truncate text-xs font-medium">{label ?? row.provider}</p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums tracking-tight">
        {formatZAR(row.priceZAR)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border/60 bg-inset/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {row.samples} quote{row.samples === 1 ? "" : "s"}
        </span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
            favorable
              ? "border-ok-bd bg-ok-bg text-ok"
              : "border-warn-bd bg-warn-bg text-warn",
          )}
        >
          {row.vsMedianPct >= 0 ? "+" : ""}
          {row.vsMedianPct.toFixed(1)}% vs median
        </span>
      </div>
    </div>
  );
}

export function ChartStatStrip({
  items,
}: {
  items: { label: string; value: string; accent?: boolean }[];
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-xl border px-3 py-2.5",
            item.accent ? "border-brand/25 bg-brand/8" : "border-border/40 bg-inset/35",
          )}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {item.label}
          </div>
          <div
            className={cn(
              "mt-0.5 font-display text-sm font-semibold tabular-nums tracking-tight",
              item.accent && "text-brand",
            )}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartShell({
  title,
  subtitle,
  legend,
  children,
}: {
  title: string;
  subtitle: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-xl border sheen">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand/[0.06] to-transparent"
        aria-hidden
      />
      <div className="relative p-5">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-display font-semibold tracking-tight">{title}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {legend}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: { label: string; swatch: string; dashed?: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm"
        >
          {item.dashed ? (
            <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: item.swatch }} />
          ) : (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: item.swatch, boxShadow: `0 0 6px ${item.swatch}55` }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

const Y_AXIS = "pulse-price";

/** Horizontal supplier bars on the Pulse dark chart well. */
export function PulseSupplierChart({
  suppliers,
  laneMedian,
  yDomain,
}: {
  suppliers: LaneSupplierPoint[];
  laneMedian: number;
  yDomain: [number, number];
}) {
  const chartHeight = Math.min(320, Math.max(200, suppliers.length * 44 + 72));

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border/40"
      style={{ background: PULSE.chartWell }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--color-brand) 12%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative px-1 pb-1 pt-2" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={suppliers}
            layout="vertical"
            margin={{ top: 8, right: 56, left: 4, bottom: 8 }}
            barCategoryGap="18%"
          >
            <CartesianGrid stroke={PULSE.grid} strokeDasharray="2 6" horizontal={false} />
            <XAxis
              type="number"
              domain={yDomain}
              tick={{ fontSize: 10, fill: PULSE.axis }}
              tickLine={false}
              axisLine={{ stroke: PULSE.gridStrong, strokeWidth: 1 }}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <YAxis
              type="category"
              dataKey="provider"
              width={108}
              tick={{ fontSize: 10, fill: PULSE.axis }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => truncateProvider(String(v), 14)}
            />
            <Tooltip
              content={<PulseSupplierTooltip />}
              cursor={{ fill: "rgba(74, 128, 255, 0.08)", radius: 6 }}
            />
            <ReferenceLine
              x={laneMedian}
              stroke={PULSE.brand}
              strokeDasharray="5 5"
              strokeOpacity={0.55}
              label={{
                value: "Median",
                position: "insideTopRight",
                fill: PULSE.axis,
                fontSize: 10,
              }}
            />
            <Bar dataKey="priceZAR" radius={[0, 8, 8, 0]} barSize={26} minPointSize={4}>
              {suppliers.map((s) => (
                <Cell key={s.provider} fill={supplierBarFill(s.priceZAR, laneMedian)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Per-supplier rate blocks below the chart — always readable even if SVG sizing fails. */
export function PulseSupplierBlocks({
  suppliers,
  laneMedian,
}: {
  suppliers: LaneSupplierPoint[];
  laneMedian: number;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {suppliers.map((s) => {
        const favorable = s.priceZAR <= laneMedian;
        const near = s.priceZAR > laneMedian && s.priceZAR <= laneMedian * 1.08;
        return (
          <div
            key={s.provider}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              favorable
                ? "border-ok-bd/60 bg-ok-bg/20"
                : near
                  ? "border-brand/30 bg-brand/10"
                  : "border-warn-bd/60 bg-warn-bg/15",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-medium" title={s.provider}>
                {s.provider}
              </p>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                  favorable
                    ? "border-ok-bd bg-ok-bg text-ok"
                    : near
                      ? "border-brand/40 bg-brand/15 text-brand"
                      : "border-warn-bd bg-warn-bg text-warn",
                )}
              >
                {s.vsMedianPct >= 0 ? "+" : ""}
                {s.vsMedianPct.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 font-display text-base font-semibold tabular-nums tracking-tight">
              {formatZAR(s.priceZAR)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {s.samples} quote{s.samples === 1 ? "" : "s"} · median {formatZAR(laneMedian)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** TradingView-style mountain line chart for lane median trend. */
export function PulseTrendChart({
  chartId,
  data,
  yDomain,
  lastPoint,
}: {
  chartId: string;
  data: LaneTrendPoint[];
  yDomain: [number, number];
  lastPoint?: LaneTrendPoint;
}) {
  const lastLabel = lastPoint?.periodLabel;

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border/40"
      style={{ background: PULSE.chartWell }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--color-brand) 12%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative h-[280px] px-1 pb-1 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 56, left: 8, bottom: 8 }}>
            <PulseChartDefs id={chartId} />
            <PulseTerminalGlowDef />
            <CartesianGrid
              stroke={PULSE.grid}
              strokeDasharray="1 0"
              vertical
              horizontal
            />
            <XAxis
              dataKey="periodLabel"
              tick={{ fontSize: 10, fill: PULSE.axis }}
              tickLine={false}
              axisLine={{ stroke: PULSE.gridStrong, strokeWidth: 1 }}
              dy={6}
              minTickGap={24}
            />
            <YAxis
              yAxisId={Y_AXIS}
              orientation="right"
              domain={yDomain}
              tick={{ fontSize: 10, fill: PULSE.axis }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              width={48}
            />
            <Tooltip
              content={<PulseTrendTooltip />}
              cursor={{
                stroke: PULSE.cursor,
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
            />
            {lastPoint && (
              <ReferenceLine
                yAxisId={Y_AXIS}
                y={lastPoint.median}
                stroke={PULSE.lineMuted}
                strokeDasharray="4 4"
                strokeWidth={1}
                ifOverflow="extendDomain"
                label={{
                  value: formatZAR(lastPoint.median),
                  position: "right",
                  fill: PULSE.ok,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            <Area
              yAxisId={Y_AXIS}
              type="linear"
              dataKey="median"
              stroke="none"
              fill={`url(#${chartId}-mountain)`}
              isAnimationActive={false}
            />
            <Line
              yAxisId={Y_AXIS}
              type="linear"
              dataKey="median"
              stroke={PULSE.line}
              strokeWidth={1.75}
              dot={false}
              activeDot={<PulseActiveDot />}
            />
            {lastPoint && lastLabel && (
              <ReferenceDot
                yAxisId={Y_AXIS}
                x={lastLabel}
                y={lastPoint.median}
                shape={<PulseTerminalDot />}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
