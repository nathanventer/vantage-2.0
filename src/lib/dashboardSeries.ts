import type { DashboardSeries, Transaction } from "@/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function routeLabel(origin: string, destination: string): string {
  const from = origin.trim() || "—";
  const to = destination.trim() || "—";
  return `${from} → ${to}`;
}

/** Logistics cost for a shipment — selected/accepted quote, else first quote. */
export function shipmentCost(t: Transaction): number {
  const quote = t.quotes.find((q) => q.status === "Accepted") ?? t.quotes[0];
  return quote?.priceZAR ?? 0;
}

/**
 * Market benchmark ("budget") for a shipment: the mean of all competing quotes.
 * Selecting below the benchmark yields savings; above it, overspend. Derived
 * purely from real quote data — no synthetic targets. Falls back to the actual
 * cost when only one quote exists (zero savings / variance).
 */
export function shipmentBenchmark(t: Transaction): number {
  const prices = t.quotes.map((q) => q.priceZAR).filter((p) => p > 0);
  if (prices.length === 0) return 0;
  return prices.reduce((sum, p) => sum + p, 0) / prices.length;
}

export interface RouteCostRow {
  route: string;
  /** Actual logistics spend (sum of selected quotes). */
  costZAR: number;
  /** Benchmark spend (sum of per-shipment quote means). */
  budgetZAR: number;
  /** budget − cost; positive = saved vs market. */
  savingsZAR: number;
  /** (cost − budget) / budget × 100; negative = under budget. */
  variancePct: number;
  shipments: number;
}

/**
 * Per-route cost rollup with benchmark/savings/variance, ranked by spend.
 * Used by the dashboard Cost-by-Route card (supports client-side period
 * filtering by passing pre-filtered transactions).
 */
export function buildRouteCostRows(txs: Transaction[]): RouteCostRow[] {
  const map = new Map<string, { cost: number; budget: number; shipments: number }>();
  for (const t of txs) {
    const cost = shipmentCost(t);
    if (cost <= 0) continue;
    const budget = shipmentBenchmark(t) || cost;
    const route = routeLabel(t.origin, t.destination);
    const agg = map.get(route) ?? { cost: 0, budget: 0, shipments: 0 };
    agg.cost += cost;
    agg.budget += budget;
    agg.shipments += 1;
    map.set(route, agg);
  }
  return [...map.entries()]
    .map(([route, a]) => ({
      route,
      costZAR: a.cost,
      budgetZAR: a.budget,
      savingsZAR: a.budget - a.cost,
      variancePct: a.budget > 0 ? ((a.cost - a.budget) / a.budget) * 100 : 0,
      shipments: a.shipments,
    }))
    .sort((x, y) => y.costZAR - x.costZAR);
}

export function buildDashboardSeriesFromTransactions(txs: Transaction[]): DashboardSeries {
  const routeMap = new Map<string, number>();
  const monthMap = new Map<number, { spendZAR: number; shipments: number }>();

  for (const t of txs) {
    const cost = shipmentCost(t);
    const route = routeLabel(t.origin, t.destination);
    routeMap.set(route, (routeMap.get(route) ?? 0) + cost);

    const month = new Date(t.createdAt).getMonth();
    const current = monthMap.get(month) ?? { spendZAR: 0, shipments: 0 };
    monthMap.set(month, {
      spendZAR: current.spendZAR + cost,
      shipments: current.shipments + 1,
    });
  }

  const routeCosts = [...routeMap.entries()]
    .map(([route, costZAR]) => ({ route, costZAR }))
    .filter((point) => point.costZAR > 0)
    .sort((a, b) => b.costZAR - a.costZAR);

  const monthlySpend = MONTHS.map((month, i) => ({
    month,
    spendZAR: monthMap.get(i)?.spendZAR ?? 0,
    shipments: monthMap.get(i)?.shipments ?? 0,
  }));

  return { monthlySpend, routeCosts };
}
