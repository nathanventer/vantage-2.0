import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, ShieldCheck, AlertCircle, Lock } from "lucide-react";

const PIPELINE = ["Service confirmed", "Invoice generated", "Payment request", "Bank gateway", "Processed", "Settled", "Reported", "Closed"];

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Vantage" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const inv = useQuery({ queryKey: ["inv"], queryFn: mockApi.listInvoices });
  const pay = useQuery({ queryKey: ["pay"], queryFn: mockApi.listPayments });

  const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);
  const invoices = inv.data ?? [];
  const payments = pay.data ?? [];

  return (
    <div>
      <PageHeader title="Payments & settlement" description="Invoicing, bank gateway verification (mock), settlement and reconciliation." />

      <div className="mb-6 rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-display font-semibold">Payment pipeline</h3>
        <div className="flex flex-wrap gap-2">
          {PIPELINE.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">{p}</div>
              {i < PIPELINE.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: Lock, label: "PCI-DSS compliant" },
            { icon: ShieldCheck, label: "TLS / encrypted" },
            { icon: AlertCircle, label: "Fraud check passed" },
          ].map(({ icon: I, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
              <I className="h-3 w-3 text-success" /> {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <StatCard label="Total invoiced" value={fmt(invoices.reduce((s, i) => s + i.amountZAR, 0))} icon={Wallet} />
        <StatCard label="Paid" value={fmt(invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amountZAR, 0))} tone="success" />
        <StatCard label="Unpaid" value={fmt(invoices.filter(i => i.status === "Unpaid").reduce((s, i) => s + i.amountZAR, 0))} tone="info" />
        <StatCard label="Overdue" value={fmt(invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amountZAR, 0))} tone="warning" />
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Settlements</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices" className="mt-4">
          <div className="rounded-xl border bg-card">
            {inv.isLoading ? <Skeleton className="h-72" /> : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="w-px">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.number}</TableCell>
                        <TableCell className="text-muted-foreground">{i.transactionRef}</TableCell>
                        <TableCell>{i.client}</TableCell>
                        <TableCell className="text-muted-foreground">{i.provider}</TableCell>
                        <TableCell className="text-right">{fmt(i.amountZAR)}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(i.dueAt).toLocaleDateString("en-ZA")}</TableCell>
                        <TableCell><StatusBadge status={i.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <div className="rounded-xl border bg-card">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="w-px">Gateway</TableHead>
                    <TableHead>Settled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                      <TableCell className="text-right">{fmt(p.amountZAR)}</TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell><StatusBadge status={p.gatewayStatus} /></TableCell>
                      <TableCell className="text-muted-foreground">{p.settledAt ? new Date(p.settledAt).toLocaleDateString("en-ZA") : "Pending"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
