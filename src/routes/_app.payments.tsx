import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import {
  paymentGateway,
  type PaymentIntent,
  type PaymentMethod,
  type SettlementState,
} from "@/adapters/paymentGateway";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  Receipt,
  ScrollText,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { Invoice } from "@/types";

export const Route = createFileRoute("/_app/payments")({
  head: () => ({ meta: [{ title: "Payments — Vantage" }] }),
  component: PaymentsPage,
});

const METHODS: { method: PaymentMethod; icon: typeof Banknote; hint: string }[] = [
  { method: "Bank Transfer", icon: Landmark, hint: "Same-day RTC" },
  { method: "EFT", icon: Banknote, hint: "1–2 business days" },
  { method: "Card", icon: CreditCard, hint: "Instant · 2.5% fee" },
  { method: "Letter of Credit", icon: ScrollText, hint: "Trade finance" },
];

const SETTLEMENT_STATES: SettlementState[] = [
  "Invoiced",
  "Payment Initiated",
  "Verified",
  "Settled",
];

/** Deterministic line-item breakdown derived from the invoice total. */
function lineItems(inv: Invoice): { label: string; amountZAR: number }[] {
  const net = Math.round(inv.amountZAR / 1.15);
  const vat = inv.amountZAR - net;
  return [
    { label: `Freight — ${inv.transactionRef}`, amountZAR: Math.round(net * 0.62) },
    { label: "Handling & destuffing", amountZAR: Math.round(net * 0.18) },
    { label: "Customs clearing & duties", amountZAR: Math.round(net * 0.14) },
    {
      label: "Cargo insurance",
      amountZAR: net - Math.round(net * 0.62) - Math.round(net * 0.18) - Math.round(net * 0.14),
    },
    { label: "VAT (15%)", amountZAR: vat },
  ];
}

function PaymentsPage() {
  const invQ = useQuery({ queryKey: ["inv"], queryFn: api.listInvoices });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  const invoices = useMemo(() => invQ.data ?? [], [invQ.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (
        q &&
        !`${i.number} ${i.transactionRef} ${i.client} ${i.provider}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [invoices, search, statusFilter]);

  const selected = invoices.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const totals = {
    invoiced: invoices.reduce((s, i) => s + i.amountZAR, 0),
    paid: invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amountZAR, 0),
    unpaid: invoices.filter((i) => i.status === "Unpaid").reduce((s, i) => s + i.amountZAR, 0),
    overdue: invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amountZAR, 0),
  };

  const initiateMut = useMutation({
    mutationFn: () => paymentGateway.initiate(selected!.number, selected!.amountZAR, method),
    onSuccess: (i) => {
      setIntent(i);
      toast.success(`${method} initiated · ${i.reference}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not initiate"),
  });

  const settleMut = useMutation({
    mutationFn: () => paymentGateway.settle(intent!),
    onSuccess: (i) => {
      setIntent(i);
      toast.success("Settlement confirmed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not settle"),
  });

  function selectInvoice(inv: Invoice) {
    setSelectedId(inv.id);
    setIntent(null);
    setMethod("Bank Transfer");
  }

  const statuses = ["all", "Paid", "Unpaid", "Overdue"];

  return (
    <div>
      <PageHeader
        title="Payments & settlement"
        description="Invoicing, bank-gateway verification (mock), settlement and reconciliation."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Total invoiced" value={formatZAR(totals.invoiced)} icon={Wallet} />
        <StatCard label="Paid" value={formatZAR(totals.paid)} tone="success" />
        <StatCard label="Unpaid" value={formatZAR(totals.unpaid)} tone="info" />
        <StatCard label="Overdue" value={formatZAR(totals.overdue)} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Invoice list */}
        <aside className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-search">Search invoices</Label>
            <Input
              id="pay-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice, shipment, party…"
            />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-inset p-0.5 text-xs">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  statusFilter === s
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {invQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices"
              description="Adjust your search or filter."
            />
          ) : (
            <ul className="space-y-2">
              {filtered.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={() => selectInvoice(inv)}
                    className={cn(
                      "w-full rounded-xl border bg-card p-3 text-left transition hover:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected?.id === inv.id && "border-brand ring-1 ring-brand/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium" title={inv.number}>
                        {inv.number}
                      </span>
                      <StatusChip status={inv.status} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate" title={inv.client}>
                        {inv.client}
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground">
                        {formatZAR(inv.amountZAR)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Detail */}
        <div className="min-w-0">
          {!selected ? (
            <EmptyState
              icon={Receipt}
              title="Select an invoice"
              description="Choose an invoice to view its summary and settle it."
            />
          ) : (
            <div className="space-y-6">
              <InvoiceSummary invoice={selected} />

              {/* Payment methods */}
              <section className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 font-display font-semibold">Payment method</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {METHODS.map(({ method: m, icon: Icon, hint }) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={method === m}
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border bg-inset/40 p-4 text-left transition hover:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        method === m && "border-brand bg-brand/5 ring-1 ring-brand/40",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          method === m ? "text-brand" : "text-muted-foreground",
                        )}
                      />
                      <span className="mt-2 truncate text-sm font-medium" title={m}>
                        {m}
                      </span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={!!intent || initiateMut.isPending}
                    onClick={() => initiateMut.mutate()}
                  >
                    Initiate settlement
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      !intent ||
                      settleMut.isPending ||
                      intent.timeline.some((e) => e.state === "Settled")
                    }
                    onClick={() => settleMut.mutate()}
                  >
                    Confirm settlement
                  </Button>
                </div>
              </section>

              <SettlementTimeline invoice={selected} intent={intent} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceSummary({ invoice }: { invoice: Invoice }) {
  const items = lineItems(invoice);
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand" />
            <h3 className="truncate font-display text-lg font-semibold" title={invoice.number}>
              {invoice.number}
            </h3>
          </div>
          <p
            className="mt-1 truncate text-sm text-muted-foreground"
            title={`${invoice.client} → ${invoice.provider}`}
          >
            {invoice.client} → {invoice.provider} · {invoice.transactionRef}
          </p>
        </div>
        <StatusChip status={invoice.status} />
      </div>

      <ul className="mt-4 divide-y border-y">
        {items.map((li) => (
          <li key={li.label} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate text-muted-foreground" title={li.label}>
              {li.label}
            </span>
            <span className="shrink-0 tabular-nums">{formatZAR(li.amountZAR)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-medium">Total due</span>
        <span className="font-display text-xl font-semibold tabular-nums">
          {formatZAR(invoice.amountZAR)}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Issued {new Date(invoice.issuedAt).toLocaleDateString("en-ZA")} · Due{" "}
        {new Date(invoice.dueAt).toLocaleDateString("en-ZA")}
      </div>
    </section>
  );
}

function SettlementTimeline({
  invoice,
  intent,
}: {
  invoice: Invoice;
  intent: PaymentIntent | null;
}) {
  // The Invoiced state is always reached (issued); later states come from the intent.
  const eventFor = (state: SettlementState) => {
    if (state === "Invoiced") {
      return (
        intent?.timeline.find((e) => e.state === "Invoiced") ?? {
          state,
          at: invoice.issuedAt,
          note: "Invoice issued",
        }
      );
    }
    return intent?.timeline.find((e) => e.state === state);
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-semibold">Settlement timeline</h3>
        {intent && (
          <span className="text-xs tabular-nums text-muted-foreground">Ref {intent.reference}</span>
        )}
      </div>
      <ol className="space-y-4">
        {SETTLEMENT_STATES.map((state, i) => {
          const ev = eventFor(state);
          const reached = !!ev;
          const isLast = i === SETTLEMENT_STATES.length - 1;
          return (
            <li key={state} className="relative flex gap-3">
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[7px] top-5 h-[calc(100%+4px)] w-px",
                    reached ? "bg-ok/40" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                  reached ? "border-ok bg-ok/30" : "border-border bg-inset",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={cn("text-sm font-medium", !reached && "text-muted-foreground")}>
                    {state}
                  </span>
                  {reached ? (
                    <StatusChip status="Verified" label="Done" />
                  ) : (
                    <StatusChip status="Pending" label="Pending" />
                  )}
                </div>
                {ev && (
                  <div className="text-xs text-muted-foreground">
                    {ev.note} · {new Date(ev.at).toLocaleString("en-ZA")}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
