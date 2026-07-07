import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/transactions/")({
  head: () => ({ meta: [{ title: "Transactions — Vantage" }] }),
  component: TxList,
});

function TxList() {
  const { data, isLoading } = useQuery({ queryKey: ["tx"], queryFn: api.listTransactions });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = (data ?? []).filter(
    (t) =>
      (status === "all" || t.status === status) &&
      (q === "" ||
        t.reference.toLowerCase().includes(q.toLowerCase()) ||
        t.demandCompany.toLowerCase().includes(q.toLowerCase())),
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Trade transactions across the Vessel → Delivery lifecycle."
        actions={
          <Button asChild>
            <Link to="/transactions/new">
              <Plus className="mr-1.5 h-4 w-4" /> New shipment request
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference or company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No transactions match your filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="h-14 cursor-pointer hover:bg-muted/40">
                  <TableCell className="font-medium">
                    <Link
                      to="/transactions/$id"
                      params={{ id: t.id }}
                      className="text-accent hover:underline"
                    >
                      {t.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{t.demandCompany}</TableCell>
                  <TableCell className="text-muted-foreground">{t.sourceProvider}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.origin} → {t.destination}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.currentStage} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(t.valueZAR)}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
