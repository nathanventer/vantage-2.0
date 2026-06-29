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
