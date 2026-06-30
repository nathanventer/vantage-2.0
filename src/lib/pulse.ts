import type { LaneRate, RateBenchmark, TransportMode } from "@/types";

export function laneLabel(origin: string, destination: string): string {
  return `${origin} → ${destination}`;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
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
