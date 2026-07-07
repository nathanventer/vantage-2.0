import { useId } from "react";
import { formatZAR } from "@/lib/format";
import { buildLaneSuppliers, buildLaneTrend, pulseYDomain } from "@/lib/pulse";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeBadge, MoMChip } from "@/components/pulse/pulseUi";
import {
  ChartLegend,
  ChartShell,
  ChartStatStrip,
  PULSE,
  PulseSupplierBlocks,
  PulseSupplierChart,
  PulseTrendChart,
} from "@/components/pulse/pulseCharts";
import { cn } from "@/lib/utils";
import type { LaneRate, RateBenchmark } from "@/types";

type PulseLaneInsightProps = {
  benchmark?: RateBenchmark;
  rates: LaneRate[];
  loading: boolean;
};

export function PulseLaneInsight({ benchmark, rates, loading }: PulseLaneInsightProps) {
  const chartId = useId().replace(/:/g, "");
  const trend = buildLaneTrend(rates, benchmark);
  const supplierSnap = buildLaneSuppliers(rates, benchmark);
  const suppliers = supplierSnap.rows;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="glass flex min-h-[32rem] items-center justify-center rounded-xl border p-8 sheen">
        <EmptyState
          title="Select a lane"
          description="Choose a row in the benchmarks table to view trend, supplier spread, and set price alerts."
        />
      </div>
    );
  }

  const trendY = pulseYDomain(trend.flatMap((p) => [p.low, p.high, p.median]));
  const supplierY = pulseYDomain(suppliers.map((s) => s.priceZAR).concat(supplierSnap.laneMedian));

  const lastTrend = trend.at(-1);
  const prevTrend = trend.at(-2);
  const periodDelta =
    lastTrend && prevTrend && prevTrend.median > 0
      ? ((lastTrend.median - prevTrend.median) / prevTrend.median) * 100
      : 0;

  const cheapest = suppliers[0];
  const priciest = suppliers.at(-1);
  const spread =
    cheapest && priciest && cheapest.provider !== priciest.provider
      ? priciest.priceZAR - cheapest.priceZAR
      : 0;

  return (
    <div className="flex min-h-[32rem] flex-col gap-4">
      <div className="glass relative overflow-hidden rounded-xl border p-5 sheen">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ModeBadge mode={benchmark.mode} />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Active lane
              </span>
            </div>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">{benchmark.lane}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {benchmark.samples} integrated observations · all-time median{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatZAR(benchmark.medianZAR)}
              </span>
              {lastTrend && (
                <>
                  {" "}
                  · latest{" "}
                  <span className="font-medium tabular-nums text-brand">
                    {formatZAR(lastTrend.median)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="All-time median" value={formatZAR(benchmark.medianZAR)} emphasis />
            <StatPill
              label="Observed range"
              value={`${formatZAR(benchmark.lowZAR)} – ${formatZAR(benchmark.highZAR)}`}
            />
            <div className="flex flex-col items-end gap-1 rounded-lg border bg-inset/40 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                MoM change
              </span>
              <MoMChip pct={benchmark.momChangePct} />
            </div>
          </div>
        </div>
        {suppliers.length > 1 && spread > 0 && supplierSnap.periodLabel && (
          <p className="relative mt-4 rounded-xl border border-border/40 bg-gradient-to-r from-inset/60 to-transparent px-3 py-2 text-xs text-muted-foreground">
            {supplierSnap.periodLabel} supplier spread:{" "}
            <span className="font-medium tabular-nums text-foreground">{formatZAR(spread)}</span> between{" "}
            <span className="text-foreground">{cheapest?.provider}</span> and{" "}
            <span className="text-foreground">{priciest?.provider}</span>
          </p>
        )}
      </div>

      <ChartShell
        title="Lane trend"
        subtitle="Monthly median · mountain fill with full-width current rate line"
        legend={
          <ChartLegend
            items={[
              { label: "Median", swatch: PULSE.line },
              { label: "Current rate", swatch: PULSE.ok },
              { label: "Price line", swatch: PULSE.lineMuted, dashed: true },
            ]}
          />
        }
      >
        {trend.length === 0 ? (
          <EmptyState title="No trend data" description="Not enough historical observations for this lane." />
        ) : (
          <>
            <ChartStatStrip
              items={[
                {
                  label: "Latest median",
                  value: formatZAR(lastTrend?.median ?? 0),
                  accent: true,
                },
                {
                  label: "Period change",
                  value: `${periodDelta >= 0 ? "+" : ""}${periodDelta.toFixed(1)}%`,
                },
                {
                  label: "Range width",
                  value: lastTrend ? formatZAR(lastTrend.high - lastTrend.low) : "—",
                },
              ]}
            />
            <PulseTrendChart
              chartId={chartId}
              data={trend}
              yDomain={trendY}
              lastPoint={lastTrend}
            />
          </>
        )}
      </ChartShell>

      <ChartShell
        title="Supplier rate analysis"
        subtitle={
          supplierSnap.periodLabel
            ? `${supplierSnap.periodLabel} quotes ranked against period median`
            : "Latest period provider quotes"
        }
        legend={
          <ChartLegend
            items={[
              { label: "Below median", swatch: PULSE.ok },
              { label: "Near median", swatch: PULSE.brand },
              { label: "Above median", swatch: PULSE.warn },
            ]}
          />
        }
      >
        {suppliers.length === 0 ? (
          <EmptyState title="No supplier data" description="No provider quotes for the latest period." />
        ) : (
          <>
            <ChartStatStrip
              items={[
                {
                  label: "Best quote",
                  value: formatZAR(cheapest?.priceZAR ?? 0),
                  accent: true,
                },
                {
                  label: "Period median",
                  value: formatZAR(supplierSnap.laneMedian),
                },
                {
                  label: "Providers",
                  value: String(suppliers.length),
                },
              ]}
            />
            <PulseSupplierChart
              suppliers={suppliers}
              laneMedian={supplierSnap.laneMedian}
              yDomain={supplierY}
            />
            <PulseSupplierBlocks suppliers={suppliers} laneMedian={supplierSnap.laneMedian} />
          </>
        )}
      </ChartShell>
    </div>
  );
}

function StatPill({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        emphasis ? "border-brand/30 bg-brand/10" : "border-border/50 bg-inset/40",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", emphasis && "text-brand")}>{value}</div>
    </div>
  );
}
