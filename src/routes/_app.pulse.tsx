import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { formatZAR } from "@/lib/format";
import { benchmarkKey, buildLaneSuppliers } from "@/lib/pulse";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PulseBenchmarksPanel } from "@/components/pulse/PulseBenchmarksPanel";
import { PulseLaneInsight } from "@/components/pulse/PulseLaneInsight";
import { PulsePriceAlerts } from "@/components/pulse/PulsePriceAlerts";
import { Check, Sparkles, Activity, Layers, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { PulsePlan, TransportMode } from "@/types";

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
  const { role } = useAuth();
  const subQ = useQuery({ queryKey: ["pulse-sub"], queryFn: api.getRateSubscription });

  if (subQ.isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Pulse" description="Rate & price intelligence" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Admins/compliance auditors can read lane_rates via RLS; demo Pulse auditor skips paywall.
  const active = subQ.data?.status === "active" || role === "admin";
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

  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<TransportMode | "all">("all");
  const [search, setSearch] = useState("");

  const filteredBench = useMemo(
    () =>
      benchmarks.filter(
        (b) =>
          (mode === "all" || b.mode === mode) &&
          (!search.trim() || b.lane.toLowerCase().includes(search.toLowerCase())),
      ),
    [benchmarks, mode, search],
  );

  const selectedKey = useMemo(() => {
    if (selected && filteredBench.some((b) => benchmarkKey(b) === selected)) return selected;
    return filteredBench[0] ? benchmarkKey(filteredBench[0]) : "";
  }, [selected, filteredBench]);

  const activeBenchmark = useMemo(
    () => filteredBench.find((b) => benchmarkKey(b) === selectedKey),
    [filteredBench, selectedKey],
  );

  // Default to the lane with the richest supplier spread so the Supplier rate
  // analysis chart shows a full comparison on load (not a single bar).
  useEffect(() => {
    if (selected || filteredBench.length === 0) return;
    const richest = [...filteredBench]
      .map((b) => ({
        b,
        suppliers: buildLaneSuppliers(rates, {
          lane: b.lane,
          origin: b.origin,
          destination: b.destination,
          mode: b.mode,
        }).rows.length,
      }))
      .sort((a, z) => z.suppliers - a.suppliers || z.b.samples - a.b.samples)[0];
    setSelected(benchmarkKey(richest?.b ?? filteredBench[0]));
  }, [filteredBench, selected, rates]);

  const cheapestLane = useMemo(
    () => [...benchmarks].sort((a, b) => a.medianZAR - b.medianZAR)[0],
    [benchmarks],
  );

  const loading = ratesQ.isLoading || benchQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pulse — Rate & Price Intelligence"
        description="Live lane benchmarks, market trends and supplier analysis — linked in one workspace."
        actions={<StatusChip status="active" label="Subscription active" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {activeBenchmark ? (
          <>
            <StatCard
              label="Selected median"
              value={formatZAR(activeBenchmark.medianZAR)}
              delta={activeBenchmark.lane}
              icon={Activity}
              tone="info"
            />
            <StatCard
              label="Month-over-month"
              value={`${activeBenchmark.momChangePct >= 0 ? "+" : ""}${activeBenchmark.momChangePct.toFixed(1)}%`}
              delta={`${activeBenchmark.mode} · ${activeBenchmark.samples} observations`}
              icon={TrendingDown}
              tone={activeBenchmark.momChangePct >= 0 ? "warning" : "success"}
            />
            <StatCard
              label="Market range"
              value={`${formatZAR(activeBenchmark.lowZAR)} – ${formatZAR(activeBenchmark.highZAR)}`}
              delta="Low to high observed"
              icon={Layers}
              tone="default"
            />
            <StatCard
              label="Lanes tracked"
              value={String(benchmarks.length)}
              delta={`${rates.length.toLocaleString("en-ZA")} total observations`}
              icon={Activity}
              tone="info"
            />
          </>
        ) : (
          <>
            <StatCard label="Lanes tracked" value={String(benchmarks.length)} icon={Activity} tone="info" />
            <StatCard
              label="Observations"
              value={rates.length.toLocaleString("en-ZA")}
              icon={Layers}
              tone="default"
            />
            <StatCard
              label="Best median lane"
              value={cheapestLane ? formatZAR(cheapestLane.medianZAR) : "—"}
              delta={cheapestLane?.lane}
              icon={TrendingDown}
              tone="success"
            />
            <StatCard
              label="Modes covered"
              value={String(new Set(benchmarks.map((b) => b.mode)).size)}
              delta="Sea · Road · Air · Rail"
              icon={Activity}
              tone="info"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <PulseBenchmarksPanel
            benchmarks={benchmarks}
            selectedKey={selectedKey}
            onSelect={setSelected}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
        <div>
          <PulseLaneInsight benchmark={activeBenchmark} rates={rates} loading={loading} />
        </div>
      </div>

      <PulsePriceAlerts
        benchmark={activeBenchmark}
        alerts={alertsQ.data ?? []}
        loading={alertsQ.isLoading}
        onSelectLane={setSelected}
      />
    </div>
  );
}
