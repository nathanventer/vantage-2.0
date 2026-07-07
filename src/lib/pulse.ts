import type { LaneRate, RateBenchmark, TransportMode } from "@/types";

export function laneLabel(origin: string, destination: string): string {
  return `${origin} → ${destination}`;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Human label for YYYY-MM period keys. */
export function formatPeriodLabel(period: string): string {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
}

/** Padded Y-axis domain from observed values (keeps charts tight to data). */
export function pulseYDomain(values: number[], paddingRatio = 0.1): [number, number] {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return [0, 100_000];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || max * 0.1;
  const pad = span * paddingRatio;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

function laneRatesFor(rates: LaneRate[], lane: LaneSelection): LaneRate[] {
  return rates.filter(
    (r) =>
      r.origin === lane.origin && r.destination === lane.destination && r.mode === lane.mode,
  );
}

/**
 * Aggregate raw lane rates into market benchmarks per lane+mode: median price,
 * low/high envelope, sample count, and month-over-month median change. Derived
 * purely from observed rates — no synthetic numbers.
 */
export function buildRateBenchmarks(rates: LaneRate[]): RateBenchmark[] {
  const groups = new Map<string, LaneRate[]>();
  for (const r of rates) {
    const key = `${r.origin}|${r.destination}|${r.mode}`;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  const out: RateBenchmark[] = [];
  for (const [key, list] of groups) {
    const [origin, destination, mode] = key.split("|") as [string, string, TransportMode];
    const prices = list.map((r) => r.priceZAR);
    const periods = [...new Set(list.map((r) => r.period))].sort();
    const last = periods.at(-1);
    const prev = periods.at(-2);
    const medLast = median(list.filter((r) => r.period === last).map((r) => r.priceZAR));
    const medPrev = prev
      ? median(list.filter((r) => r.period === prev).map((r) => r.priceZAR))
      : medLast;
    const momChangePct = medPrev > 0 ? ((medLast - medPrev) / medPrev) * 100 : 0;

    out.push({
      lane: laneLabel(origin, destination),
      origin,
      destination,
      mode,
      medianZAR: Math.round(median(prices)),
      lowZAR: Math.min(...prices),
      highZAR: Math.max(...prices),
      samples: list.length,
      momChangePct,
    });
  }
  return out.sort((a, b) => a.lane.localeCompare(b.lane));
}

export type LaneSelection = Pick<RateBenchmark, "lane" | "origin" | "destination" | "mode">;

export type LaneTrendPoint = {
  period: string;
  periodLabel: string;
  median: number;
  low: number;
  high: number;
  samples: number;
};

/** Monthly median + observed low/high band for a lane+mode. */
export function buildLaneTrend(rates: LaneRate[], lane?: LaneSelection): LaneTrendPoint[] {
  if (!lane) return [];
  const byPeriod = new Map<string, number[]>();
  for (const r of laneRatesFor(rates, lane)) {
    const arr = byPeriod.get(r.period) ?? [];
    arr.push(r.priceZAR);
    byPeriod.set(r.period, arr);
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, prices]) => ({
      period,
      periodLabel: formatPeriodLabel(period),
      median: Math.round(median(prices)),
      low: Math.min(...prices),
      high: Math.max(...prices),
      samples: prices.length,
    }));
}

export type LaneSupplierPoint = {
  provider: string;
  priceZAR: number;
  samples: number;
  vsMedianPct: number;
};

/** Provider quotes for the latest (or given) period on a lane. */
export function buildLaneSuppliers(
  rates: LaneRate[],
  lane?: LaneSelection,
  period?: string,
): { period: string; periodLabel: string; rows: LaneSupplierPoint[]; laneMedian: number } {
  if (!lane) return { period: "", periodLabel: "", rows: [], laneMedian: 0 };

  const matching = laneRatesFor(rates, lane);
  const periods = [...new Set(matching.map((r) => r.period))].sort();
  const target = period ?? periods.at(-1) ?? "";
  if (!target) return { period: "", periodLabel: "", rows: [], laneMedian: 0 };

  const periodRates = matching.filter((r) => r.period === target);
  const byProvider = new Map<string, number[]>();
  for (const r of periodRates) {
    const arr = byProvider.get(r.providerName) ?? [];
    arr.push(r.priceZAR);
    byProvider.set(r.providerName, arr);
  }

  const laneMedian = Math.round(median(periodRates.map((r) => r.priceZAR)));
  const rows = [...byProvider.entries()]
    .map(([provider, prices]) => {
      const priceZAR = Math.round(median(prices));
      const vsMedianPct = laneMedian > 0 ? ((priceZAR - laneMedian) / laneMedian) * 100 : 0;
      return { provider, priceZAR, samples: prices.length, vsMedianPct };
    })
    .sort((a, b) => a.priceZAR - b.priceZAR);

  return {
    period: target,
    periodLabel: formatPeriodLabel(target),
    rows,
    laneMedian,
  };
}

export function benchmarkKey(b: Pick<RateBenchmark, "lane" | "mode">): string {
  return `${b.lane}|${b.mode}`;
}

/** Suggested alert thresholds derived from integrated benchmark stats. */
export function alertPresets(benchmark: RateBenchmark) {
  return [
    {
      id: "below-low",
      label: "Drop below market low",
      description: `Notify when median falls under ${benchmark.lowZAR.toLocaleString("en-ZA")}`,
      direction: "below" as const,
      thresholdZAR: benchmark.lowZAR,
    },
    {
      id: "below-median",
      label: "Drop below median",
      description: "Catch softening before you overpay",
      direction: "below" as const,
      thresholdZAR: benchmark.medianZAR,
    },
    {
      id: "above-median",
      label: "Rise above median",
      description: "Flag rate hikes on this lane",
      direction: "above" as const,
      thresholdZAR: benchmark.medianZAR,
    },
    {
      id: "above-high",
      label: "Rise above market high",
      description: `Alert above ${benchmark.highZAR.toLocaleString("en-ZA")}`,
      direction: "above" as const,
      thresholdZAR: benchmark.highZAR,
    },
  ];
}
