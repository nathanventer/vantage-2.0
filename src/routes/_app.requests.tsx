import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatZAR } from "@/lib/format";
import { toast } from "sonner";
import { Send } from "lucide-react";
import type { ShipmentRequest } from "@/types";

export const Route = createFileRoute("/_app/requests")({
  head: () => ({ meta: [{ title: "Incoming Requests — Vantage" }] }),
  component: RequestsPage,
});

const EMPTY = {
  freight: "",
  customs: "",
  warehouse: "",
  transport: "",
  other: "",
  transitDays: "",
};

function RequestsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["req"], queryFn: api.listShipmentRequests });
  const [target, setTarget] = useState<ShipmentRequest | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const n = (v: string) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const subtotal =
    n(form.freight) + n(form.customs) + n(form.warehouse) + n(form.transport) + n(form.other);
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const total = subtotal + vat;

  const quoteMut = useMutation({
    mutationFn: () =>
      api.submitQuote({
        shipmentId: target!.id,
        freightCostZAR: n(form.freight),
        customsCostZAR: n(form.customs),
        warehouseCostZAR: n(form.warehouse),
        transportCostZAR: n(form.transport),
        otherCostZAR: n(form.other),
        transitDays: n(form.transitDays),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["req"] });
      void qc.invalidateQueries({ queryKey: ["tx"] });
      setTarget(null);
      setForm({ ...EMPTY });
      toast.success("Quote submitted — the buyer can now review it.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Unable to submit the quote. Please try again."),
  });

  function openQuote(r: ShipmentRequest) {
    setTarget(r);
    setForm({ ...EMPTY });
  }

  return (
    <div>
      <PageHeader
        title="Incoming requests"
        description="New shipment requests routed to your operation. Submit a quote to compete for the award."
      />
      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No incoming requests right now.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>{r.demandCompany}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.origin} → {r.destination}
                  </TableCell>
                  <TableCell>{r.cargo}</TableCell>
                  <TableCell>{r.weightTons} t</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openQuote(r)}>
                      <Send className="mr-1 h-3.5 w-3.5" /> Submit quote
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Submit quote</DialogTitle>
            <DialogDescription>
              {target ? `${target.demandCompany} · ${target.origin} → ${target.destination}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Cost
              id="freight"
              label="Freight (ZAR)"
              value={form.freight}
              onChange={(v) => setForm({ ...form, freight: v })}
            />
            <Cost
              id="customs"
              label="Customs (ZAR)"
              value={form.customs}
              onChange={(v) => setForm({ ...form, customs: v })}
            />
            <Cost
              id="warehouse"
              label="Warehousing (ZAR)"
              value={form.warehouse}
              onChange={(v) => setForm({ ...form, warehouse: v })}
            />
            <Cost
              id="transport"
              label="Transport (ZAR)"
              value={form.transport}
              onChange={(v) => setForm({ ...form, transport: v })}
            />
            <Cost
              id="other"
              label="Other (ZAR)"
              value={form.other}
              onChange={(v) => setForm({ ...form, other: v })}
            />
            <Cost
              id="transitDays"
              label="Transit (days)"
              value={form.transitDays}
              onChange={(v) => setForm({ ...form, transitDays: v })}
            />
          </div>
          <div className="rounded-lg border bg-inset/40 px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatZAR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (15%)</span>
              <span className="tabular-nums">{formatZAR(vat)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
              <span>Quote total</span>
              <span className="tabular-nums">{formatZAR(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={subtotal <= 0 || quoteMut.isPending}
              onClick={() => quoteMut.mutate()}
            >
              {quoteMut.isPending ? "Submitting…" : "Submit quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Cost({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}
