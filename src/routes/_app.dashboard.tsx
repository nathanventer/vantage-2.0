import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { useRole } from "@/contexts/RoleContext";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Ship, Clock, FileWarning, Wallet, Inbox, Truck, ShieldCheck,
  TrendingUp, Activity, Package,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Vantage" }] }),
  component: Dashboard,
});

const COLORS = ["#0B2545", "#1B9AAA", "#1A7F4B", "#C97A0A", "#2D6CDF"];

function Dashboard() {
  const { role } = useRole();
  const txQ = useQuery({ queryKey: ["tx"], queryFn: mockApi.listTransactions });
  const seriesQ = useQuery({ queryKey: ["series"], queryFn: mockApi.dashboardSeries });
  const invQ = useQuery({ queryKey: ["inv"], queryFn: mockApi.listInvoices });
  const reqQ = useQuery({ queryKey: ["req"], queryFn: mockApi.listShipmentRequests });
  const regQ = useQuery({ queryKey: ["reg"], queryFn: mockApi.listRegistrations });
  const cfQ = useQuery({ queryKey: ["cf"], queryFn: mockApi.listComplianceFlags });
  const aeQ = useQuery({ queryKey: ["ae"], queryFn: mockApi.listAuditEvents });

  if (txQ.isLoading || seriesQ.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }
  const txs = txQ.data ?? [];
  const inv = invQ.data ?? [];
  const series = seriesQ.data;

  const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

  const demandKpis = [
    { label: "Active shipments", value: txs.filter(t => t.status !== "Closed").length, icon: Ship, tone: "default" as const },
    { label: "In transit", value: txs.filter(t => t.currentStage === "Transport").length, icon: Truck, tone: "info" as const },
    { label: "Pending approvals", value: inv.filter(i => i.status === "Unpaid").length, icon: Clock, tone: "warning" as const },
    { label: "Spend this month", value: fmt(2_840_000), delta: "+12% vs last month", icon: Wallet, tone: "success" as const },
  ];
  const sourceKpis = [
    { label: "Incoming requests", value: (reqQ.data ?? []).filter(r => r.status === "Open").length, icon: Inbox, tone: "info" as const },
    { label: "Jobs in progress", value: txs.filter(t => t.status === "In Progress").length, icon: Activity, tone: "warning" as const },
    { label: "Fleet utilisation", value: "78%", delta: "Target 75%", icon: Truck, tone: "success" as const },
    { label: "Settlements due", value: fmt(1_245_000), icon: Wallet, tone: "default" as const },
  ];
  const adminKpis = [
    { label: "Pending registrations", value: (regQ.data ?? []).filter(r => r.status === "Under Review").length, icon: Clock, tone: "warning" as const },
    { label: "Compliance flags", value: (cfQ.data ?? []).filter(c => c.status !== "Closed").length, icon: FileWarning, tone: "info" as const },
    { label: "Audit events (30d)", value: (aeQ.data ?? []).length, icon: ShieldCheck, tone: "default" as const },
    { label: "Platform volume", value: fmt(48_300_000), delta: "Last 30 days", icon: TrendingUp, tone: "success" as const },
  ];

  const kpis = role === "demand" ? demandKpis : role === "source" ? sourceKpis : adminKpis;

  return (
    <div>
      <PageHeader
        title={role === "demand" ? "Demand workspace" : role === "source" ? "Source operations" : "Admin & compliance"}
        description="Operational overview across the trade and logistics lifecycle."
        actions={
          role === "demand" ? (
            <Button asChild className="bg-accent hover:bg-accent/90"><Link to="/transactions/new">New shipment</Link></Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-semibold">Monthly spend & shipment volume</h3>
            <span className="text-xs text-muted-foreground">Last 12 months</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series?.monthlySpend ?? []}>
              <CartesianGrid stroke="#E3E8EF" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#5B6B7C" fontSize={12} />
              <YAxis stroke="#5B6B7C" fontSize={12} tickFormatter={(v) => `R${(v/1_000_000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="spend" stroke="#0B2545" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="shipments" stroke="#1B9AAA" strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 font-display font-semibold">Cost by route</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={series?.routeCosts ?? []} dataKey="cost" nameKey="route" outerRadius={90}>
                {(series?.routeCosts ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-display font-semibold">Recent transactions</h3>
            <Button variant="ghost" size="sm" asChild><Link to="/transactions">View all</Link></Button>
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
                    <div className="text-xs text-muted-foreground">{t.origin} → {t.destination}</div>
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
            <BarChart data={["Vessel","Port","Clearing","Transport","Warehouse","Delivery"].map((stage) => ({ stage, count: txs.filter(t => t.currentStage === stage).length }))}>
              <CartesianGrid stroke="#E3E8EF" strokeDasharray="3 3" />
              <XAxis dataKey="stage" stroke="#5B6B7C" fontSize={12} />
              <YAxis stroke="#5B6B7C" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#1B9AAA" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
