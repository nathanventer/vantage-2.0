import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, MapPin, TrendingDown, TrendingUp } from "lucide-react";
import { buildRouteCostRows, type RouteCostRow } from "@/lib/dashboardSeries";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

type Period = "30" | "90" | "ytd";
type SortKey = "cost" | "variance";

const PERIODS: { key: Period; label: string }[] = [
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "ytd", label: "YTD" },
];

function withinPeriod(createdAt: string, period: Period): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  const now = Date.now();
  if (period === "ytd") {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    return created >= yearStart;
  }
  const days = period === "30" ? 30 : 90;
  return created >= now - days * 24 * 60 * 60 * 1000;
}

function VarianceChip({ pct }: { pct: number }) {
  const favorable = pct <= 0;
  const Icon = favorable ? TrendingDown : TrendingUp;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        favorable ? "border-ok-bd bg-ok-bg text-ok" : "border-err-bd bg-err-bg text-err",
      )}
      title={`${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs benchmark`}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RouteCostRow }[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="max-w-[220px] truncate text-xs font-medium">{r.route}</p>
      <p className="mt-1 font-display text-sm font-semibold tabular-nums">{formatZAR(r.costZAR)}</p>
      <p className="text-[11px] tabular-nums text-muted-foreground">
        Benchmark {formatZAR(r.budgetZAR)} · {r.shipments} shipment{r.shipments === 1 ? "" : "s"}
      </p>
    </div>
  );
}

const CHART_ROWS = 6;

export function CostByRoutePanel({
  transactions,
  loading = false,
}: {
  transactions: Transaction[];
  loading?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("90");
  const [sort, setSort] = useState<SortKey>("cost");

  const rows = useMemo(() => {
    const filtered = transactions.filter((t) => withinPeriod(t.createdAt, period));
    const built = buildRouteCostRows(filtered);
    const sorted = [...built].sort((a, b) =>
      sort === "cost" ? b.costZAR - a.costZAR : a.variancePct - b.variancePct,
    );
    return sorted;
  }, [transactions, period, sort]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          cost: acc.cost + r.costZAR,
          savings: acc.savings + r.savingsZAR,
        }),
        { cost: 0, savings: 0 },
      ),
    [rows],
  );

  const chartData = rows.slice(0, CHART_ROWS);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card p-5 sheen">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold tracking-tight">Cost by route</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Logistics spend vs market benchmark
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Period"
          className="inline-flex shrink-0 rounded-full border bg-inset p-0.5 text-xs"
        >
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={period === p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === p.key
                  ? "bg-surface-2 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-inset" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-inset/40 px-6 py-10 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No route cost data</p>
          <p className="max-w-[240px] text-xs text-muted-foreground">
            Costs appear once shipments in this period have accepted quotes.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Total spend
              </div>
              <div className="font-display text-lg font-semibold tabular-nums leading-tight">
                {formatZAR(totals.cost)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Saved vs benchmark
              </div>
              <div
                className={cn(
                  "font-display text-lg font-semibold tabular-nums leading-tight",
                  totals.savings >= 0 ? "text-ok" : "text-err",
                )}
              >
                {formatZAR(totals.savings)}
              </div>
            </div>
          </div>

          <div className="-mx-1 mb-2 h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="route" hide />
                <Tooltip cursor={{ fill: "var(--color-surface-2)" }} content={<ChartTooltip />} />
                <Bar dataKey="costZAR" radius={[4, 4, 4, 4]} barSize={12}>
                  {chartData.map((r) => (
                    <Cell key={r.route} fill="var(--color-brand)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2 text-left font-medium">Route</th>
                  <th className="py-2 px-2 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => setSort("cost")}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        sort === "cost" && "text-foreground",
                      )}
                    >
                      Total
                      {sort === "cost" && <ArrowDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="py-2 px-2 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => setSort("variance")}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        sort === "variance" && "text-foreground",
                      )}
                    >
                      Variance
                      {sort === "variance" && <ArrowUp className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="py-2 pl-2 text-right font-medium">Savings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.route} className="border-b border-border/50 last:border-0">
                    <td className="max-w-0 py-2.5 pr-2">
                      <div className="truncate font-medium" title={r.route}>
                        {r.route}
                      </div>
                      <div className="text-[11px] tabular-nums text-muted-foreground">
                        {r.shipments} shipment{r.shipments === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 px-2 text-right font-medium tabular-nums">
                      {formatZAR(r.costZAR)}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <VarianceChip pct={r.variancePct} />
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap py-2.5 pl-2 text-right font-medium tabular-nums",
                        r.savingsZAR >= 0 ? "text-ok" : "text-err",
                      )}
                    >
                      {formatZAR(r.savingsZAR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
