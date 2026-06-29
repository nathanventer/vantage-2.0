import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Vantage" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const tx = useQuery({ queryKey: ["tx"], queryFn: mockApi.listTransactions });
  const ser = useQuery({ queryKey: ["series"], queryFn: mockApi.dashboardSeries });

  const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

  const txs = tx.data ?? [];
  const totalValue = txs.reduce((s, t) => s + t.valueZAR, 0);

  const supplierScores = ["Maersk SA", "Bidvest", "Imperial", "DSV", "Grindrod"].map((name, i) => ({
    name, score: 70 + (i * 7) % 25, capacity: 60 + (i * 9) % 35, cost: 65 + (i * 5) % 30, risk: 80 - (i * 6) % 20,
  }));

  return (
    <div>
      <PageHeader title="Reporting & analytics" description="Transaction, cost, operational, compliance and source-selection insights." />

      <Tabs defaultValue="tx">
        <TabsList className="flex-wrap">
          <TabsTrigger value="tx">Transactions</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="ops">Operational</TabsTrigger>
          <TabsTrigger value="comp">Compliance</TabsTrigger>
          <TabsTrigger value="src">Source selection</TabsTrigger>
        </TabsList>

        <TabsContent value="tx" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total transactions" value={txs.length} />
            <StatCard label="Total value" value={fmt(totalValue)} tone="success" />
            <StatCard label="Avg transit time" value="9.4 days" tone="info" />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Monthly shipments</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ser.data?.monthlySpend ?? []}>
                <CartesianGrid stroke="#E3E8EF" strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                <Bar dataKey="shipments" fill="#1B9AAA" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="cost" className="mt-4 space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Spend trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={ser.data?.monthlySpend ?? []}>
                <CartesianGrid stroke="#E3E8EF" strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R${(v/1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="spendZAR" stroke="#0B2545" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Route</TableHead><TableHead className="text-right">Avg cost</TableHead><TableHead className="text-right">vs Budget</TableHead></TableRow></TableHeader>
              <TableBody>
                {(ser.data?.routeCosts ?? []).map((r, i) => (
                  <TableRow key={r.route}>
                    <TableCell>{r.route}</TableCell>
                    <TableCell className="text-right">{fmt(r.costZAR)}</TableCell>
                    <TableCell className="text-right"><StatusBadge status={i % 3 === 0 ? "Pending" : "Verified"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ops" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Warehouse util." value="82%" tone="success" />
            <StatCard label="Fleet util." value="78%" tone="success" />
            <StatCard label="Container turn." value="3.2 d" tone="info" />
            <StatCard label="SLA on-time" value="94%" tone="success" />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Productivity index</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { area: "Receiving", v: 88 }, { area: "Destuffing", v: 79 },
                { area: "Palletising", v: 92 }, { area: "Dispatch", v: 84 }, { area: "Last-mile", v: 76 },
              ]}>
                <CartesianGrid stroke="#E3E8EF" strokeDasharray="3 3" />
                <XAxis dataKey="area" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                <Bar dataKey="v" fill="#0B2545" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="comp" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="SARS reconciled" value="97%" tone="success" />
            <StatCard label="Customs" value="96%" tone="success" />
            <StatCard label="Documentation" value="91%" tone="warning" />
            <StatCard label="CAPA open" value="6" tone="info" />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Compliance coverage</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={[
                { area: "SARS", v: 97 }, { area: "Customs", v: 96 }, { area: "Docs", v: 91 },
                { area: "Transport", v: 88 }, { area: "Environmental", v: 84 }, { area: "SOP", v: 93 },
              ]}>
                <PolarGrid stroke="#E3E8EF" />
                <PolarAngleAxis dataKey="area" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[60, 100]} fontSize={10} />
                <Radar name="Coverage" dataKey="v" stroke="#1B9AAA" fill="#1B9AAA" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="src" className="mt-4 space-y-4">
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Cost rank</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierScores.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.score}</TableCell>
                    <TableCell className="text-right">{s.capacity}</TableCell>
                    <TableCell className="text-right">{s.cost}</TableCell>
                    <TableCell className="text-right">{s.risk}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
