import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { MacroJourney } from "@/components/MacroJourney";
import { OpsConsole } from "@/components/ops/OpsConsole";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaperDocumentDialog, type PaperDocumentProps } from "@/components/PaperDocument";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Ship,
  MapPin,
  Package,
  Building2,
  Download,
  FileText,
  Check,
  Radar,
} from "lucide-react";
import { toast } from "sonner";
import type { StatusLabel } from "@/types";

export const Route = createFileRoute("/_app/transactions/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — Vantage` }] }),
  component: TxDetail,
  notFoundComponent: () => <div className="p-6">Transaction not found.</div>,
});

function TxDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["tx", id],
    queryFn: () => api.getTransaction(id),
  });
  const docsQ = useQuery({ queryKey: ["doc"], queryFn: api.listDocuments });
  const auditQ = useQuery({ queryKey: ["ae"], queryFn: api.listAuditEvents });
  const tripsQ = useQuery({ queryKey: ["tp"], queryFn: api.listTrips });
  const qc = useQueryClient();
  const [quoteDoc, setQuoteDoc] = useState<PaperDocumentProps | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; provider: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const refreshTx = () => {
    void qc.invalidateQueries({ queryKey: ["tx", id] });
    void qc.invalidateQueries({ queryKey: ["tx"] });
  };

  const acceptMut = useMutation({
    // Route param may be a reference (TXN-…) — mutations always use the row id.
    mutationFn: (quoteId: string) => api.selectQuote(data?.id ?? id, quoteId),
    onSuccess: () => {
      refreshTx();
      toast.success("Quote accepted — provider awarded.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Unable to accept the quote. Please try again."),
  });

  const rejectMut = useMutation({
    mutationFn: () => api.rejectQuote(data?.id ?? id, rejectTarget!.id, rejectReason),
    onSuccess: () => {
      refreshTx();
      setRejectTarget(null);
      toast.success("Quote rejected — the reason has been recorded.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Unable to reject the quote. Please try again."),
  });

  const linkedTrip = useMemo(
    () => (tripsQ.data ?? []).find((t) => t.shipmentRef === data?.reference),
    [tripsQ.data, data?.reference],
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(n);

  const linkedDocs = useMemo(
    () => (docsQ.data ?? []).filter((d) => d.transactionRef === data?.reference),
    [docsQ.data, data?.reference],
  );

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data)
    return (
      <EmptyState
        title="Transaction not found"
        description="The reference may have been removed or is incorrect."
        action={
          <Button asChild variant="outline">
            <Link to="/transactions">Back to transactions</Link>
          </Button>
        }
      />
    );

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-3">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>
      <Breadcrumbs
        items={[{ label: "Transactions", to: "/transactions" }, { label: data.reference }]}
      />

      <PageHeader
        title={data.reference}
        description={`${data.demandCompany} · ${data.sourceProvider}`}
        actions={
          <div className="flex items-center gap-2">
            {linkedTrip && (
              <Button asChild size="sm" variant="outline">
                <Link to="/tracking/$tripId" params={{ tripId: linkedTrip.id }}>
                  <Radar className="mr-1.5 h-3.5 w-3.5" /> Track live
                </Link>
              </Button>
            )}
            <StatusBadge status={data.status} />
          </div>
        }
      />

      <MacroJourney current={data.currentStage} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="lifecycle">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="agreement">Agreement</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="lifecycle">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-display font-semibold">16-step lifecycle</h3>
                <LifecycleStepper steps={data.steps} />
              </div>
            </TabsContent>

            <TabsContent value="operations">
              <OpsConsole transaction={data} />
            </TabsContent>

            <TabsContent value="quotes">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 font-display font-semibold">Provider quotes</h3>
                <ul className="space-y-2">
                  {data.quotes.map((q) => {
                    const status: StatusLabel = q.status;
                    const anyAccepted = data.quotes.some((x) => x.status === "Accepted");
                    return (
                      <li
                        key={q.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{q.providerName}</div>
                          <div className="text-xs text-muted-foreground">
                            ETA {q.etaDays} days ·{" "}
                            <span className="tabular-nums">{fmt(q.priceZAR)}</span>
                          </div>
                          {q.status === "Rejected" && q.rejectionReason && (
                            <div className="mt-1 text-xs text-warning">
                              Rejected
                              {q.rejectedAt
                                ? ` ${new Date(q.rejectedAt).toLocaleDateString("en-ZA")}`
                                : ""}{" "}
                              — {q.rejectionReason}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={status} />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setQuoteDoc({
                                kind: "QUOTE",
                                reference: `${data.reference} · ${q.providerName.split(" ")[0].toUpperCase()}`,
                                status:
                                  status === "Accepted"
                                    ? { label: "Accepted", tone: "ok" }
                                    : status === "Rejected"
                                      ? { label: "Not selected", tone: "muted" }
                                      : { label: "Quotation", tone: "info" },
                                from: {
                                  name: q.providerName,
                                  email: "quotes@provider.co.za",
                                  address: ["Durban 4001, South Africa"],
                                },
                                to: {
                                  name: data.demandCompany,
                                  address: [`${data.origin} → ${data.destination}`],
                                },
                                sectionTitle: "Quotation",
                                lines: [
                                  {
                                    label: `Freight — ${data.origin} → ${data.destination}`,
                                    amountZAR: Math.round((q.priceZAR / 1.15) * 0.62),
                                  },
                                  {
                                    label: "Customs clearing & duties",
                                    amountZAR: Math.round((q.priceZAR / 1.15) * 0.14),
                                  },
                                  {
                                    label: "Handling & warehousing",
                                    amountZAR: Math.round((q.priceZAR / 1.15) * 0.18),
                                  },
                                  {
                                    label: `Cargo insurance · transit ${q.etaDays} days`,
                                    amountZAR:
                                      Math.round(q.priceZAR / 1.15) -
                                      Math.round((q.priceZAR / 1.15) * 0.62) -
                                      Math.round((q.priceZAR / 1.15) * 0.14) -
                                      Math.round((q.priceZAR / 1.15) * 0.18),
                                  },
                                ],
                                terms: `Quotation valid for 14 days. Estimated transit ${q.etaDays} days. Subject to Vantage master service terms.`,
                                footnote: `Vantage · Quotation for ${data.reference}`,
                              })
                            }
                          >
                            View quote
                          </Button>
                          {!anyAccepted && q.status === "Quoted" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acceptMut.isPending}
                                onClick={() => acceptMut.mutate(q.id)}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                {acceptMut.isPending ? "Accepting…" : "Accept"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-warning hover:text-warning"
                                onClick={() => {
                                  setRejectTarget({ id: q.id, provider: q.providerName });
                                  setRejectReason("");
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <PaperDocumentDialog
                  open={!!quoteDoc}
                  onOpenChange={(o) => !o && setQuoteDoc(null)}
                  doc={quoteDoc}
                />
                {data.quotes.some((q) => q.status === "Accepted") && (
                  <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                    Quote accepted — service agreement available in the <strong>Agreement</strong>{" "}
                    tab.
                  </div>
                )}
              </div>

              {/* Mandatory rejection reason (FIX 5) */}
              <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display">Reject quote</DialogTitle>
                    <DialogDescription>
                      {rejectTarget ? `${rejectTarget.provider} · ${data.reference}` : ""}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="reject-reason">Reason for rejection (required)</Label>
                    <textarea
                      id="reject-reason"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Quoted rate exceeds the approved budget for this lane"
                      className="w-full rounded-md border border-input bg-inset px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      The reason is recorded on the quote and shared with the provider.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectTarget(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={rejectReason.trim().length < 3 || rejectMut.isPending}
                      onClick={() => rejectMut.mutate()}
                    >
                      {rejectMut.isPending ? "Rejecting…" : "Reject quote"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="documents">
              <div className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Linked documents</h3>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/documents">Manage documents</Link>
                  </Button>
                </div>
                {linkedDocs.length === 0 ? (
                  <EmptyState
                    title="No documents linked yet"
                    description="Documents attached to this transaction will appear here."
                    icon={FileText}
                  />
                ) : (
                  <ul className="divide-y">
                    {linkedDocs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{d.type}</div>
                            <div className="text-xs text-muted-foreground">
                              v{d.version} · {d.uploadedBy}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.signed && <StatusBadge status="Verified" />}
                          <StatusBadge status={d.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="agreement">
              <div className="rounded-xl border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Service agreement</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success("Agreement download started (stub)")}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg border bg-background/40 p-5 text-sm leading-relaxed">
                  <div className="text-center">
                    <div className="font-display text-lg font-semibold">SERVICE AGREEMENT</div>
                    <div className="text-xs text-muted-foreground">Reference {data.reference}</div>
                  </div>
                  <p>
                    This agreement is entered into between <strong>{data.demandCompany}</strong>{" "}
                    ("Demand") and <strong>{data.sourceProvider}</strong> ("Source") for the
                    logistics movement of <strong>{data.cargo}</strong> from{" "}
                    <strong>{data.origin}</strong> to <strong>{data.destination}</strong>, cargo
                    configuration <strong>{data.containerNo ?? "—"}</strong>
                    {data.vessel ? `, vessel ${data.vessel}` : ""}.
                  </p>
                  <p>
                    Agreed value: <strong className="tabular-nums">{fmt(data.valueZAR)}</strong>.
                    Standard SLAs and SOPs of the Vantage platform apply. Compliance and SARS
                    verification are performed against uploaded documentation.
                  </p>
                  <div className="grid grid-cols-2 gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <div>
                      Signed (Demand)
                      <br />
                      <span className="font-medium text-foreground">
                        {data.demandCompany}
                      </span> · <em>e-signature placeholder</em>
                    </div>
                    <div>
                      Signed (Source)
                      <br />
                      <span className="font-medium text-foreground">
                        {data.sourceProvider}
                      </span> · <em>e-signature placeholder</em>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 font-display font-semibold">Activity</h3>
                <ul className="space-y-3">
                  {(auditQ.data ?? []).slice(0, 8).map((e) => (
                    <li key={e.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-accent" />
                      <div className="flex-1">
                        <div className="font-medium">{e.action}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.actor} · {new Date(e.timestamp).toLocaleString("en-ZA")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Summary</h3>
            <dl className="space-y-3 text-sm">
              <Row icon={Building2} label="Demand" value={data.demandCompany} />
              <Row icon={Building2} label="Provider" value={data.sourceProvider} />
              <Row icon={MapPin} label="Origin" value={data.origin} />
              <Row icon={MapPin} label="Destination" value={data.destination} />
              <Row icon={Ship} label="Vessel" value={data.vessel ?? "—"} />
              <Row icon={Package} label="Cargo Configuration" value={data.containerNo ?? "—"} />
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground">Cargo value</div>
                <div className="font-display text-xl font-semibold tabular-nums">
                  {fmt(data.valueZAR)}
                </div>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Ship; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  );
}
