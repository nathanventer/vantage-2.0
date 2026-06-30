import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/services";
import { formatZAR } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Check,
  Bell,
  Sparkles,
  LineChart as LineIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { LaneRate, PulsePlan, RateBenchmark, TransportMode } from "@/types";

export const Route = createFileRoute("/_app/pulse")({
  head: () => ({ meta: [{ title: "Pulse — Rate Intelligence — Vantage" }] }),
  component: PulsePage,
});

const PLANS: { id: PulsePlan; name: string; price: string; features: string[] }[] = [
  {
    id: "standard",
    name: "Pulse Standard",
    price: "R2 499 / mo",
    features: ["Lane rate search & comparison", "Market benchmarks", "Monthly trend charts"],
  },
  {
    id: "pro",
    name: "Pulse Pro",
    price: "R5 999 / mo",
    features: [
      "Everything in Standard",
      "Supplier rate analysis",
      "Unlimited price alerts",
      "Scheduled report delivery",
    ],
  },
];

function PulsePage() {
  const subQ = useQuery({ queryKey: ["pulse-sub"], queryFn: api.getRateSubscription });

  if (subQ.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Pulse" description="Rate & price intelligence" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const active = subQ.data?.status === "active";
  return active ? <PulseDashboard /> : <Paywall />;
}

function Paywall() {
  const qc = useQueryClient();
  const checkout = useMutation({
    mutationFn: (plan: PulsePlan) => api.startPulseCheckout(plan),
    onSuccess: (res) => {
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.success("Pulse activated");
        qc.invalidateQueries({ queryKey: ["pulse-sub"] });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Checkout failed"),
  });

  return (
    <div>
      <PageHeader
        title="Pulse — Rate & Price Intelligence"
        description="Benchmark lanes, track market trends and never overpay for freight."
      />
      <div className="mb-6 rounded-xl border border-brand/30 bg-brand/5 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-brand">
          <Sparkles className="h-4 w-4" /> Subscription required
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pulse is Vantage&apos;s rate intelligence product. Choose a plan to unlock live lane
          benchmarks, trend analysis and price alerts.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border bg-card p-6">
            <div className="font-display text-lg font-semibold">{p.name}</div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums">{p.price}</div>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-5"
              disabled={checkout.isPending}
              onClick={() => checkout.mutate(p.id)}
            >
              {checkout.isPending ? "Starting…" : `Subscribe to ${p.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PulseDashboard() {
  const ratesQ = useQuery({ queryKey: ["lane-rates"], queryFn: api.listLaneRates });
  const benchQ = useQuery({ queryKey: ["rate-benchmarks"], queryFn: api.listRateBenchmarks });
  const alertsQ = useQuery({ queryKey: ["price-alerts"], queryFn: api.listPriceAlerts });

  const rates = useMemo(() => ratesQ.data ?? [], [ratesQ.data]);
  const benchmarks = useMemo(() => benchQ.data ?? [], [benchQ.data]);

  const lanes = useMemo(() => {
    const seen = new Map<
      string,
      { lane: string; origin: string; destination: string; mode: TransportMode }
    >();
    for (const b of benchmarks) seen.set(`${b.lane}|${b.mode}`, b);
    return [...seen.values()];
  }, [benchmarks]);

  const [selected, setSelected] = useState<string>("");
  const [mode, setMode] = useState<TransportMode | "all">("all");
  const [search, setSearch] = useState("");

  const selectedKey = selected || (lanes[0] ? `${lanes[0].lane}|${lanes[0].mode}` : "");
  const selectedLane = lanes.find((l) => `${l.lane}|${l.mode}` === selectedKey);

  const filteredBench = useMemo(
    () =>
      benchmarks.filter(
        (b) =>
          (mode === "all" || b.mode === mode) &&
          (!search.trim() || b.lane.toLowerCase().includes(search.toLowerCase())),
      ),
    [benchmarks, mode, search],
  );

  const trend = useMemo(() => buildTrend(rates, selectedLane), [rates, selectedLane]);
  const suppliers = useMemo(() => buildSuppliers(rates, selectedLane), [rates, selectedLane]);

  const cheapestLane = useMemo(
    () => [...benchmarks].sort((a, b) => a.medianZAR - b.medianZAR)[0],
    [benchmarks],
  );

  const loading = ratesQ.isLoading || benchQ.isLoading;

  return (
    <div>
      <PageHeader
        title="Pulse — Rate & Price Intelligence"
        description="Live lane benchmarks, market trends and supplier analysis."
        actions={<StatusChip status="active" label="Subscription active" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lanes tracked" value={String(lanes.length)} icon={LineIcon} />
        <StatCard
          label="Observations"
          value={rates.length.toLocaleString("en-ZA")}
          icon={TrendingUp}
        />
        <StatCard
          label="Best median lane"
          value={cheapestLane ? formatZAR(cheapestLane.medianZAR) : "—"}
          delta={cheapestLane?.lane}
          icon={TrendingDown}
        />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pulse-search">Search lane</Label>
          <Input
            id="pulse-search"
            placeholder="e.g. Durban"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pulse-mode">Mode</Label>
          <select
            id="pulse-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as TransportMode | "all")}
            className="h-10 rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All modes</option>
            <option value="Sea">Sea</option>
            <option value="Road">Road</option>
            <option value="Air">Air</option>
            <option value="Rail">Rail</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Benchmarks table */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 font-display font-semibold">Market benchmarks</h3>
          {loading ? (
            <Skeleton className="h-64" />
          ) : filteredBench.length === 0 ? (
            <EmptyState title="No lanes match" description="Adjust your search or mode filter." />
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Lane</th>
                    <th className="py-2">Mode</th>
                    <th className="py-2 text-right">Median</th>
                    <th className="py-2 text-right">MoM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBench.map((b) => (
                    <tr
                      key={`${b.lane}|${b.mode}`}
                      className="cursor-pointer border-b border-border/40 hover:bg-inset/40"
                      onClick={() => setSelected(`${b.lane}|${b.mode}`)}
                    >
                      <td className="max-w-44 truncate py-2" title={b.lane}>
                        {b.lane}
                      </td>
                      <td className="py-2 text-muted-foreground">{b.mode}</td>
                      <td className="py-2 text-right tabular-nums">{formatZAR(b.medianZAR)}</td>
                      <td className="py-2 text-right">
                        <MoMChip pct={b.momChangePct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lane trend */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-1 font-display font-semibold">Lane trend</h3>
          <p className="mb-3 truncate text-xs text-muted-foreground" title={selectedLane?.lane}>
            {selectedLane ? `${selectedLane.lane} · ${selectedLane.mode}` : "Select a lane"}
          </p>
          {loading ? (
            <Skeleton className="h-64" />
          ) : trend.length === 0 ? (
            <EmptyState title="No trend data" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-text-subtle)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-text-subtle)"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<ChartTip />} />
                <Line
                  type="monotone"
                  dataKey="median"
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Supplier analysis */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 font-display font-semibold">Supplier rate analysis</h3>
          {loading ? (
            <Skeleton className="h-56" />
          ) : suppliers.length === 0 ? (
            <EmptyState title="No supplier data" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={suppliers} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="provider"
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-text-subtle)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-text-subtle)"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="avg" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Price alerts */}
        <PriceAlerts lane={selectedLane} alerts={alertsQ.data ?? []} loading={alertsQ.isLoading} />
      </div>
    </div>
  );
}

function PriceAlerts({
  lane,
  alerts,
  loading,
}: {
  lane?: { lane: string; mode: TransportMode };
  alerts: import("@/types").PriceAlert[];
  loading: boolean;
}) {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("below");

  const createMut = useMutation({
    mutationFn: () =>
      api.createPriceAlert({
        lane: lane?.lane ?? "",
        mode: lane?.mode ?? "Sea",
        thresholdZAR: Number(threshold),
        direction,
      }),
    onSuccess: () => {
      toast.success("Price alert created");
      setThreshold("");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create alert"),
  });

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
        <Bell className="h-4 w-4 text-accent" /> Price alerts
      </h3>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="alert-threshold">Threshold (ZAR)</Label>
          <Input
            id="alert-threshold"
            type="number"
            placeholder="100000"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alert-dir">Trigger</Label>
          <select
            id="alert-dir"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "above" | "below")}
            className="h-9 rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="below">Drops below</option>
            <option value="above">Rises above</option>
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!lane || !threshold || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          Add alert
        </Button>
      </div>
      {loading ? (
        <Skeleton className="h-20" />
      ) : alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No alerts yet. Select a lane and set a threshold to be notified of rate moves.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background/40 p-2.5 text-sm"
            >
              <span className="min-w-0 truncate" title={a.lane}>
                {a.lane} · {a.mode}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {a.direction === "below" ? "↓" : "↑"}{" "}
                <span className="tabular-nums">{formatZAR(a.thresholdZAR)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MoMChip({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
        up ? "bg-err-bg/40 text-err" : "bg-ok-bg/40 text-ok"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

interface TipPayload {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string | number;
}
function ChartTip({ active, payload, label }: TipPayload) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      <div className="tabular-nums text-muted-foreground">{formatZAR(payload[0].value)}</div>
    </div>
  );
}

function buildTrend(
  rates: LaneRate[],
  lane?: { origin: string; destination: string; mode: TransportMode },
) {
  if (!lane) return [];
  const byPeriod = new Map<string, number[]>();
  for (const r of rates) {
    if (r.origin === lane.origin && r.destination === lane.destination && r.mode === lane.mode) {
      const arr = byPeriod.get(r.period) ?? [];
      arr.push(r.priceZAR);
      byPeriod.set(r.period, arr);
    }
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, prices]) => ({
      period,
      median: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
    }));
}

function buildSuppliers(
  rates: LaneRate[],
  lane?: { origin: string; destination: string; mode: TransportMode },
) {
  if (!lane) return [];
  const byProvider = new Map<string, number[]>();
  for (const r of rates) {
    if (r.origin === lane.origin && r.destination === lane.destination && r.mode === lane.mode) {
      const arr = byProvider.get(r.providerName) ?? [];
      arr.push(r.priceZAR);
      byProvider.set(r.providerName, arr);
    }
  }
  return [...byProvider.entries()].map(([provider, prices]) => ({
    provider,
    avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
  }));
}
