import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { optimizer, OPTIMIZER_WEIGHTS, type ScoredQuote } from "@/adapters/optimizer";
import { reportingService, type ReportExport } from "@/services/reporting";
import { useAuth } from "@/contexts/AuthContext";
import { buildRouteCostRows } from "@/lib/dashboardSeries";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusChip } from "@/components/StatusChip";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet, FileText, ShieldCheck, Table2 } from "lucide-react";
import { toast } from "sonner";
import type { Transaction } from "@/types";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Vantage" }] }),
  component: ReportsPage,
});

type Period = "30" | "90" | "ytd";
const PERIODS: { key: Period; label: string }[] = [
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "ytd", label: "YTD" },
];

const GRID = "var(--color-border)";
const AXIS = "var(--color-text-subtle)";

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-surface-2 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="tabular-nums text-muted-foreground">
          {p.name}: {money ? formatZAR(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

function ExportMenu({ build }: { build: () => ReportExport }) {
  function run(kind: "csv" | "xlsx" | "pdf") {
    const report = build();
    if (report.rows.length === 0) {
      toast.error("Nothing to export for this period");
      return;
    }
    reportingService[kind](report);
    toast.success(`Exported ${report.name}.${kind}`);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Download report</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run("csv")}>
          <Table2 className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> XLSX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")}>
          <FileText className="mr-2 h-4 w-4" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReportShell({
  title,
  period,
  exportBuild,
  children,
}: {
  title: string;
  period: string;
  exportBuild: () => ReportExport;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">VANTAGE · {period}</p>
        </div>
        <ExportMenu build={exportBuild} />
      </div>
      {children}
    </div>
  );
}

function within(t: Transaction, period: Period): boolean {
  const d = new Date(t.createdAt);
  const now = new Date();
  if (period === "ytd") return d.getFullYear() === now.getFullYear();
  const days = Number(period);
  return now.getTime() - d.getTime() <= days * 86_400_000;
}

function ReportsPage() {
  const { role } = useAuth();
  const txQ = useQuery({ queryKey: ["tx"], queryFn: api.listTransactions });
  const whQ = useQuery({ queryKey: ["rep-wh"], queryFn: api.listWarehouseJobs });
  const tripQ = useQuery({ queryKey: ["rep-trips"], queryFn: api.listTrips });
  const contQ = useQuery({ queryKey: ["rep-cont"], queryFn: api.listContainerJobs });
  const cargoQ = useQuery({ queryKey: ["rep-cargo"], queryFn: api.listCargoHandling });
  const flagQ = useQuery({ queryKey: ["rep-flags"], queryFn: api.listComplianceFlags });
  const invQ = useQuery({ queryKey: ["inv"], queryFn: api.listInvoices });
  const ratesQ = useQuery({ queryKey: ["lane-rates"], queryFn: api.listLaneRates });
  const [period, setPeriod] = useState<Period>("90");
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  const txs = useMemo(() => (txQ.data ?? []).filter((t) => within(t, period)), [txQ.data, period]);

  // ── Management Overview (FIX 11): executive summary from live data ─────────
  const mgmt = useMemo(() => {
    const all = txQ.data ?? [];
    const quotes = all.flatMap((t) => t.quotes);
    const accepted = quotes.filter((q) => q.status === "Accepted");
    const rejected = quotes.filter((q) => q.status === "Rejected");
    const pending = quotes.filter((q) => q.status === "Quoted");
    const avgQuote = quotes.length
      ? Math.round(quotes.reduce((s, q) => s + q.priceZAR, 0) / quotes.length)
      : 0;
    const invoices = invQ.data ?? [];
    const invoiceTotal = invoices.reduce((s, i) => s + i.amountZAR, 0);
    const outstanding = invoices
      .filter((i) => i.status !== "Paid")
      .reduce((s, i) => s + i.amountZAR, 0);

    const laneCount = new Map<string, { count: number; value: number }>();
    for (const t of all) {
      const lane = `${t.origin} → ${t.destination}`;
      const e = laneCount.get(lane) ?? { count: 0, value: 0 };
      e.count += 1;
      e.value += t.valueZAR;
      laneCount.set(lane, e);
    }
    const topLanes = [...laneCount.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([lane, v]) => ({ lane, count: v.count, value: v.value }));

    const providerCount = new Map<string, number>();
    for (const q of accepted)
      providerCount.set(q.providerName || "—", (providerCount.get(q.providerName || "—") ?? 0) + 1);
    const topProviders = [...providerCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const stageBreakdown = (
      ["Vessel", "Port", "Clearing", "Transport", "Warehouse", "Delivery"] as const
    ).map((stage) => ({ stage, count: all.filter((t) => t.currentStage === stage).length }));
    const withVessel = all.filter((t) => t.vessel || t.vesselImo || t.vesselMmsi).length;
    const rates = ratesQ.data ?? [];
    const avgLaneRate = rates.length
      ? Math.round(rates.reduce((s, r) => s + r.priceZAR, 0) / rates.length)
      : 0;

    return {
      total: all.length,
      active: all.filter((t) => t.status === "In Progress").length,
      completed: all.filter((t) => t.status === "Closed").length,
      pending: pending.length,
      accepted: accepted.length,
      rejected: rejected.length,
      rejectedList: rejected.filter((q) => q.rejectionReason).slice(0, 5),
      avgQuote,
      invoiceTotal,
      outstanding,
      topLanes,
      topProviders,
      stageBreakdown,
      withVessel,
      lanesTracked: rates.length,
      avgLaneRate,
    };
  }, [txQ.data, invQ.data, ratesQ.data]);

  // ── Operational KPIs (computed from live ops data) ────────────────────────
  const ops = useMemo(() => {
    const jobs = whQ.data ?? [];
    const trips = tripQ.data ?? [];
    const conts = contQ.data ?? [];
    const steps = jobs.flatMap((j) => j.checklist);
    const whUtil = steps.length
      ? Math.round((steps.filter((s) => s.done).length / steps.length) * 100)
      : 0;
    const fleetUtil = trips.length
      ? Math.round((trips.filter((t) => t.status !== "Scheduled").length / trips.length) * 100)
      : 0;
    const avgDwell = conts.length ? conts.reduce((s, c) => s + c.dwellDays, 0) / conts.length : 0;
    const delivered = trips.filter((t) => t.status === "Delivered");
    const sla = delivered.length
      ? Math.round((delivered.filter((t) => t.podUploaded).length / delivered.length) * 100)
      : 100;
    return { whUtil, fleetUtil, avgDwell, sla };
  }, [whQ.data, tripQ.data, contQ.data]);

  // Productivity per cargo operation = share handled in good condition.
  const productivity = useMemo(() => {
    const ops_ = cargoQ.data ?? [];
    const AREAS: { area: string; match: string[] }[] = [
      { area: "Receiving", match: ["Bulk Handling"] },
      { area: "Destuffing", match: ["Offloading"] },
      { area: "Palletising", match: ["Palletising"] },
      { area: "Dispatch", match: ["Loading"] },
      { area: "Weighbridge", match: ["Weighbridge"] },
    ];
    return AREAS.map(({ area, match }) => {
      const subset = ops_.filter((o) => match.includes(o.operation));
      const good = subset.filter((o) => o.condition === "Good").length;
      return { area, v: subset.length ? Math.round((good / subset.length) * 100) : 0 };
    });
  }, [cargoQ.data]);

  // ── Compliance coverage per area = share of flags resolved (no flags → 100) ─
  const compliance = useMemo(() => {
    const flags = flagQ.data ?? [];
    const AREAS = [
      "SARS",
      "Customs",
      "Documentation",
      "Transport",
      "Environmental",
      "SOP",
    ] as const;
    const coverage = AREAS.map((area) => {
      const inArea = flags.filter((f) => f.area === area);
      const closed = inArea.filter((f) => f.status === "Closed").length;
      return {
        area,
        v: inArea.length ? Math.round((closed / inArea.length) * 100) : 100,
      };
    });
    const capaOpen = flags.filter((f) => f.status !== "Closed").length;
    const pct = (area: string) => coverage.find((c) => c.area === area)?.v ?? 100;
    return { coverage, capaOpen, pct };
  }, [flagQ.data]);

  const totalValue = txs.reduce((s, t) => s + t.valueZAR, 0);
  const routeRows = useMemo(() => buildRouteCostRows(txs), [txs]);
  const totalSpend = routeRows.reduce((s, r) => s + r.costZAR, 0);
  const totalSavings = routeRows.reduce((s, r) => s + r.savingsZAR, 0);

  // ── Source-selection scorecard (real, via Optimizer) ─────────────────────
  const sourceResult = useMemo(() => {
    const agg = new Map<string, { name: string; price: number[]; eta: number[] }>();
    for (const t of txs) {
      for (const q of t.quotes) {
        const e = agg.get(q.providerId) ?? { name: q.providerName, price: [], eta: [] };
        e.price.push(q.priceZAR);
        e.eta.push(q.etaDays);
        agg.set(q.providerId, e);
      }
    }
    const inputs = [...agg.entries()].map(([providerId, v]) => ({
      id: providerId,
      providerId,
      providerName: v.name,
      priceZAR: Math.round(v.price.reduce((a, b) => a + b, 0) / v.price.length),
      etaDays: Math.round(v.eta.reduce((a, b) => a + b, 0) / v.eta.length),
    }));
    return optimizer.score(inputs);
  }, [txs]);

  const monthly = useMemo(() => {
    const m = new Map<string, { month: string; spendZAR: number; shipments: number }>();
    for (const t of txs) {
      const key = new Date(t.createdAt).toLocaleString("en-ZA", {
        month: "short",
        year: "2-digit",
      });
      const e = m.get(key) ?? { month: key, spendZAR: 0, shipments: 0 };
      e.spendZAR += t.valueZAR;
      e.shipments += 1;
      m.set(key, e);
    }
    return [...m.values()];
  }, [txs]);

  // ── Per-report export builders ───────────────────────────────────────────
  const txExport = (): ReportExport => ({
    name: `vantage-transactions-${period}`,
    title: "Transaction report",
    columns: ["Reference", "Route", "Cargo", "Status", "Value (ZAR)"],
    rows: txs.map((t) => [
      t.reference,
      `${t.origin} → ${t.destination}`,
      t.cargo,
      t.status,
      t.valueZAR,
    ]),
    meta: [
      { label: "Period", value: periodLabel },
      { label: "Transactions", value: String(txs.length) },
      { label: "Total value", value: formatZAR(totalValue) },
    ],
  });
  const costExport = (): ReportExport => ({
    name: `vantage-cost-${period}`,
    title: "Cost report",
    columns: ["Route", "Total cost (ZAR)", "Budget (ZAR)", "Variance %", "Savings (ZAR)"],
    rows: routeRows.map((r) => [
      r.route,
      Math.round(r.costZAR),
      Math.round(r.budgetZAR),
      `${r.variancePct.toFixed(1)}%`,
      Math.round(r.savingsZAR),
    ]),
    meta: [
      { label: "Period", value: periodLabel },
      { label: "Total spend", value: formatZAR(totalSpend) },
      { label: "Total savings", value: formatZAR(totalSavings) },
    ],
  });
  const srcExport = (): ReportExport => ({
    name: `vantage-source-selection-${period}`,
    title: "Source-selection report",
    columns: ["Rank", "Provider", "Cost", "Service", "Compliance", "Capacity", "Risk", "Total"],
    rows: sourceResult.ranked.map((s) => [
      s.rank,
      s.providerName,
      s.costScore,
      s.serviceScore,
      s.complianceScoreWeighted,
      s.capacityScoreWeighted,
      s.riskScoreWeighted,
      s.totalScore,
    ]),
    meta: [
      { label: "Weights", value: "Cost 25 · Service 25 · Compliance 20 · Capacity 15 · Risk 15" },
      {
        label: "Recommended",
        value: sourceResult.ranked[0]?.providerName ?? "—",
      },
      { label: "Savings vs benchmark", value: formatZAR(sourceResult.savingsZAR) },
    ],
  });

  if (txQ.isLoading) {
    return (
      <div>
        <PageHeader title="Reporting & analytics" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reporting & analytics"
        description="Transaction, cost, operational, compliance and source-selection insights."
      />

      {/* Global period filter */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Period</span>
        <div className="inline-flex rounded-lg border bg-inset p-0.5 text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-3 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

      <Tabs defaultValue="mgmt">
        <TabsList className="flex-wrap">
          <TabsTrigger value="mgmt">Management Overview</TabsTrigger>
          <TabsTrigger value="tx">Transactions</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="ops">Operational</TabsTrigger>
          <TabsTrigger value="comp">Compliance</TabsTrigger>
          <TabsTrigger value="src">Source selection</TabsTrigger>
        </TabsList>

        {/* Management Overview (FIX 11) */}
        <TabsContent value="mgmt" className="mt-4">
          <ReportShell
            title="Management Overview Report"
            period={periodLabel}
            exportBuild={() => ({
              name: `vantage-management-overview-${period}`,
              title: "Management Overview Report",
              columns: ["Metric", "Value"],
              rows: [
                ["Total shipments", mgmt.total],
                ["Active shipments", mgmt.active],
                ["Completed shipments", mgmt.completed],
                ["Quotes pending", mgmt.pending],
                ["Quotes accepted", mgmt.accepted],
                ["Quotes rejected", mgmt.rejected],
                ["Average quote value", formatZAR(mgmt.avgQuote)],
                ["Pro-forma invoice total", formatZAR(mgmt.invoiceTotal)],
                ["Outstanding invoices", formatZAR(mgmt.outstanding)],
                ["Shipments with vessel tracking", mgmt.withVessel],
                ["Lanes benchmarked", mgmt.lanesTracked],
                ["Average lane rate", formatZAR(mgmt.avgLaneRate)],
              ],
              meta: [{ label: "Period", value: periodLabel }],
            })}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Total shipments" value={mgmt.total} />
              <StatCard label="Active" value={mgmt.active} tone="info" />
              <StatCard label="Completed" value={mgmt.completed} tone="success" />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Quotes pending" value={mgmt.pending} />
              <StatCard label="Accepted" value={mgmt.accepted} tone="success" />
              <StatCard label="Rejected" value={mgmt.rejected} tone="warning" />
              <StatCard label="Avg quote value" value={formatZAR(mgmt.avgQuote)} tone="info" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Pro-forma invoice total" value={formatZAR(mgmt.invoiceTotal)} />
              <StatCard label="Outstanding" value={formatZAR(mgmt.outstanding)} tone="warning" />
              <StatCard label="With vessel tracking" value={mgmt.withVessel} tone="info" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <h4 className="mb-3 font-display font-semibold">Top lanes</h4>
                <DataTable
                  columns={["Lane", "Shipments", "Value"]}
                  rows={mgmt.topLanes.map((l) => [
                    l.lane,
                    String(l.count),
                    <span key={l.lane} className="tabular-nums">
                      {formatZAR(l.value)}
                    </span>,
                  ])}
                  rightAlignLast
                />
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h4 className="mb-3 font-display font-semibold">Top providers (awarded)</h4>
                <DataTable
                  columns={["Provider", "Awards"]}
                  rows={
                    mgmt.topProviders.length
                      ? mgmt.topProviders.map((p) => [p.name, String(p.count)])
                      : [["No awards in this period", "—"]]
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-display font-semibold">Lifecycle stage breakdown</h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mgmt.stageBreakdown}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="stage" fontSize={12} stroke={AXIS} />
                  <YAxis fontSize={12} stroke={AXIS} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--color-surface-2)" }} content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-display font-semibold">Rejected quotes &amp; reasons</h4>
              {mgmt.rejectedList.length ? (
                <DataTable
                  columns={["Provider", "Reason"]}
                  rows={mgmt.rejectedList.map((q) => [
                    q.providerName || "—",
                    q.rejectionReason ?? "—",
                  ])}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No rejected quotes in this period.</p>
              )}
            </div>
          </ReportShell>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="tx" className="mt-4">
          <ReportShell title="Transaction report" period={periodLabel} exportBuild={txExport}>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Total transactions" value={txs.length} />
              <StatCard label="Total value" value={formatZAR(totalValue)} tone="success" />
              <StatCard
                label="Avg value"
                value={formatZAR(txs.length ? Math.round(totalValue / txs.length) : 0)}
                tone="info"
              />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-display font-semibold">Monthly shipments</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthly}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} stroke={AXIS} />
                  <YAxis fontSize={12} stroke={AXIS} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--color-surface-2)" }} content={<ChartTooltip />} />
                  <Bar dataKey="shipments" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              columns={["Reference", "Route", "Status", "Value"]}
              rows={txs.map((t) => [
                t.reference,
                `${t.origin} → ${t.destination}`,
                <StatusChip key={t.id} status={t.status} />,
                <span key={`${t.id}v`} className="tabular-nums">
                  {formatZAR(t.valueZAR)}
                </span>,
              ])}
              rightAlignLast
            />
          </ReportShell>
        </TabsContent>

        {/* Cost */}
        <TabsContent value="cost" className="mt-4">
          <ReportShell title="Cost report" period={periodLabel} exportBuild={costExport}>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Total spend" value={formatZAR(totalSpend)} />
              <StatCard label="Total savings" value={formatZAR(totalSavings)} tone="success" />
              <StatCard label="Routes" value={routeRows.length} tone="info" />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-display font-semibold">Spend trend</h4>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthly}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} stroke={AXIS} />
                  <YAxis
                    fontSize={12}
                    stroke={AXIS}
                    tickFormatter={(v) => `R${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip content={<ChartTooltip money />} />
                  <Line
                    type="monotone"
                    dataKey="spendZAR"
                    name="Spend"
                    stroke="var(--color-brand)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <DataTable
              columns={["Route", "Total cost", "Variance", "Savings"]}
              rows={routeRows.map((r) => [
                r.route,
                <span key={`${r.route}c`} className="tabular-nums">
                  {formatZAR(r.costZAR)}
                </span>,
                <StatusChip
                  key={`${r.route}v`}
                  status={r.variancePct <= 0 ? "Verified" : "Pending"}
                  label={`${r.variancePct > 0 ? "+" : ""}${r.variancePct.toFixed(1)}%`}
                />,
                <span key={`${r.route}s`} className="tabular-nums">
                  {formatZAR(r.savingsZAR)}
                </span>,
              ])}
            />
          </ReportShell>
        </TabsContent>

        {/* Operational */}
        <TabsContent value="ops" className="mt-4">
          <ReportShell
            title="Operational report"
            period={periodLabel}
            exportBuild={() => ({
              name: `vantage-operational-${period}`,
              title: "Operational report",
              columns: ["Metric", "Value"],
              rows: [
                ["Warehouse utilisation", `${ops.whUtil}%`],
                ["Fleet utilisation", `${ops.fleetUtil}%`],
                ["Container turn (days)", ops.avgDwell.toFixed(1)],
                ["POD compliance", `${ops.sla}%`],
              ],
              meta: [{ label: "Period", value: periodLabel }],
            })}
          >
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                label="Warehouse util."
                value={`${ops.whUtil}%`}
                tone={ops.whUtil >= 70 ? "success" : "warning"}
              />
              <StatCard
                label="Fleet util."
                value={`${ops.fleetUtil}%`}
                tone={ops.fleetUtil >= 70 ? "success" : "warning"}
              />
              <StatCard
                label="Container turn."
                value={`${ops.avgDwell.toFixed(1)} d`}
                tone="info"
              />
              <StatCard
                label="POD compliance"
                value={`${ops.sla}%`}
                tone={ops.sla >= 90 ? "success" : "warning"}
              />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-display font-semibold">
                Productivity index{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (share handled in good condition)
                </span>
              </h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={productivity}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" fontSize={12} stroke={AXIS} />
                  <YAxis fontSize={12} stroke={AXIS} />
                  <Tooltip cursor={{ fill: "var(--color-surface-2)" }} content={<ChartTooltip />} />
                  <Bar dataKey="v" name="Index" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ReportShell>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="comp" className="mt-4">
          <ReportShell
            title="Compliance report"
            period={periodLabel}
            exportBuild={() => ({
              name: `vantage-compliance-${period}`,
              title: "Compliance report",
              columns: ["Area", "Coverage %"],
              rows: compliance.coverage.map((c) => [c.area, c.v]),
              meta: [{ label: "Period", value: periodLabel }],
            })}
          >
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                label="SARS reconciled"
                value={`${compliance.pct("SARS")}%`}
                tone={compliance.pct("SARS") >= 90 ? "success" : "warning"}
              />
              <StatCard
                label="Customs"
                value={`${compliance.pct("Customs")}%`}
                tone={compliance.pct("Customs") >= 90 ? "success" : "warning"}
              />
              <StatCard
                label="Documentation"
                value={`${compliance.pct("Documentation")}%`}
                tone={compliance.pct("Documentation") >= 90 ? "success" : "warning"}
              />
              <StatCard label="CAPA open" value={String(compliance.capaOpen)} tone="info" />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h4 className="mb-3 font-display font-semibold">
                Compliance coverage{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (share of flags resolved per area)
                </span>
              </h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart layout="vertical" data={compliance.coverage} margin={{ left: 24 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} fontSize={12} stroke={AXIS} />
                  <YAxis type="category" dataKey="area" fontSize={12} stroke={AXIS} width={90} />
                  <Tooltip cursor={{ fill: "var(--color-surface-2)" }} content={<ChartTooltip />} />
                  <Bar
                    dataKey="v"
                    name="Coverage"
                    fill="var(--color-brand)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ReportShell>
        </TabsContent>

        {/* Source selection */}
        <TabsContent value="src" className="mt-4">
          <ReportShell title="Source-selection report" period={periodLabel} exportBuild={srcExport}>
            <SourceSelection result={sourceResult} isAdmin={role === "admin"} />
          </ReportShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourceSelection({
  result,
  isAdmin,
}: {
  result: ReturnType<typeof optimizer.score>;
  isAdmin: boolean;
}) {
  const recommended = result.ranked[0];
  const [overrideId, setOverrideId] = useState<string>("");
  const [reason, setReason] = useState("");

  function applyOverride() {
    if (!overrideId || !reason.trim()) {
      toast.error("An override requires a recorded reason");
      return;
    }
    const chosen = result.ranked.find((r) => r.id === overrideId);
    // TODO Phase 2: persist source_override_reason against the shipment.
    toast.success(`Override recorded: ${chosen?.providerName} — “${reason.trim()}”`);
  }

  if (result.ranked.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
        No quotes in this period to score.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Weights + recommendation */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-5">
          <h4 className="mb-3 font-display font-semibold">Scoring weights</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(OPTIMIZER_WEIGHTS).map(([k, v]) => (
              <span
                key={k}
                className="rounded-full border bg-inset px-3 py-1 font-medium capitalize tabular-nums"
              >
                {k} {v}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Recommended: </span>
              <span className="font-semibold">{recommended.providerName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total score: </span>
              <span className="font-semibold tabular-nums">{recommended.totalScore}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Savings vs benchmark: </span>
              <span className="font-semibold tabular-nums text-ok">
                {formatZAR(result.savingsZAR)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-brand/40 bg-brand/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand">
            <ShieldCheck className="h-4 w-4" /> Recommendation
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {recommended.providerName} ranks #1 on the weighted model with a total of{" "}
            <span className="tabular-nums text-foreground">{recommended.totalScore}</span>/100.
          </p>
        </div>
      </div>

      {/* Ranked table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Provider</th>
              <th className="px-4 py-2 text-right">Cost</th>
              <th className="px-4 py-2 text-right">Service</th>
              <th className="px-4 py-2 text-right">Compliance</th>
              <th className="px-4 py-2 text-right">Capacity</th>
              <th className="px-4 py-2 text-right">Risk</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-left">Risk flag</th>
            </tr>
          </thead>
          <tbody>
            {result.ranked.map((s: ScoredQuote) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-2 tabular-nums text-muted-foreground">{s.rank}</td>
                <td className="max-w-[180px] truncate px-4 py-2 font-medium" title={s.providerName}>
                  {s.providerName}
                  {s.rank === 1 && (
                    <span className="ml-2 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                      REC
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{s.costScore}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.serviceScore}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.complianceScoreWeighted}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.capacityScoreWeighted}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.riskScoreWeighted}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{s.totalScore}</td>
                <td className="px-4 py-2">
                  <StatusChip
                    status={(s.riskScore ?? 0) >= 80 ? "Verified" : "Pending"}
                    label={(s.riskScore ?? 0) >= 80 ? "Low" : "Elevated"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin override */}
      {isAdmin && (
        <div className="rounded-xl border bg-card p-5">
          <h4 className="font-display font-semibold">Admin override</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecting a non-recommended source requires a recorded reason (source_override_reason).
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[260px_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="ov-src">Source</Label>
              <select
                id="ov-src"
                value={overrideId}
                onChange={(e) => setOverrideId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select provider…</option>
                {result.ranked.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.providerName} ({s.totalScore})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ov-reason">Reason</Label>
              <Input
                id="ov-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why override the recommendation?"
              />
            </div>
            <Button onClick={applyOverride} disabled={!overrideId || !reason.trim()}>
              Record override
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  rightAlignLast,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  rightAlignLast?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
            {columns.map((c, i) => (
              <th
                key={c}
                className={cn(
                  "px-4 py-2 text-left",
                  rightAlignLast && i === columns.length - 1 && "text-right",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn("px-4 py-2", rightAlignLast && ci === r.length - 1 && "text-right")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
