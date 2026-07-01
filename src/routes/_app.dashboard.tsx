import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { subscribeTable } from "@/lib/realtime";
import { useRole } from "@/contexts/RoleContext";
import { buildRoleKpis } from "@/lib/demoKpis";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MonthlySpendChart } from "@/components/dashboard/MonthlySpendChart";
import { CostByRoutePanel } from "@/components/dashboard/CostByRoutePanel";
import { LifecycleProgress } from "@/components/dashboard/LifecycleProgress";
import { Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vantage" }] }),
  component: Dashboard,
});

const GRID = "color-mix(in oklab, var(--color-border) 100%, transparent)";
const AXIS = "var(--color-muted-foreground)";

function Dashboard() {
  const { role } = useRole();
  const qc = useQueryClient();
  const txQ = useQuery({ queryKey: ["tx"], queryFn: api.listTransactions });
  const metricsQ = useQuery({ queryKey: ["dashboard-metrics"], queryFn: api.getDashboardMetrics });

  useEffect(() => {
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ["tx"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      qc.invalidateQueries({ queryKey: ["series"] });
      qc.invalidateQueries({ queryKey: ["ae"] });
    };
    const unsubEvents = subscribeTable("shipment_events", refresh);
    const unsubShipments = subscribeTable("shipments", refresh);
    return () => {
      unsubEvents();
      unsubShipments();
    };
  }, [qc]);

  if (txQ.isLoading || metricsQ.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const txs = txQ.data ?? [];
  const metrics = metricsQ.data;
  const kpis = metrics ? buildRoleKpis(role, metrics) : [];

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div>
      <PageHeader
        title={
          role === "demand"
            ? "Demand workspace"
            : role === "source"
              ? "Source operations"
              : "Admin & compliance"
        }
        description="Operational overview across the trade and logistics lifecycle."
        actions={
          role === "demand" ? (
            <Button asChild>
              <Link to="/transactions/new">New shipment</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-6">
        <LifecycleProgress transactions={txs} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
          <MonthlySpendChart data={metrics?.series.monthlySpend ?? []} />
        </div>

        <div className="lg:col-span-2">
          <CostByRoutePanel transactions={txs} loading={txQ.isLoading} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-display font-semibold">Recent transactions</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/transactions">View all</Link>
            </Button>
          </div>
          <div className="divide-y">
            {txs.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                to="/transactions/$id"
                params={{ id: t.id }}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{t.reference}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.origin} → {t.destination}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{fmt(t.valueZAR)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-4 font-display font-semibold">Lifecycle stage distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={["Vessel", "Port", "Clearing", "Transport", "Warehouse", "Delivery"].map(
                (stage) => ({ stage, count: txs.filter((t) => t.currentStage === stage).length }),
              )}
            >
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="stage"
                stroke={AXIS}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              <Bar dataKey="count" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
