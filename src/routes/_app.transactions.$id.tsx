import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { MacroJourney } from "@/components/MacroJourney";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Ship, MapPin, Package, Building2, Download, FileText, Check } from "lucide-react";
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
  const { data, isLoading } = useQuery({ queryKey: ["tx", id], queryFn: () => mockApi.getTransaction(id) });
  const docsQ = useQuery({ queryKey: ["doc"], queryFn: mockApi.listDocuments });
  const auditQ = useQuery({ queryKey: ["ae"], queryFn: mockApi.listAuditEvents });
  const [acceptedId, setAcceptedId] = useState<string | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

  const linkedDocs = useMemo(
    () => (docsQ.data ?? []).filter((d) => d.transactionRef === data?.reference),
    [docsQ.data, data?.reference],
  );

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return (
    <EmptyState
      title="Transaction not found"
      description="The reference may have been removed or is incorrect."
      action={<Button asChild variant="outline"><Link to="/transactions">Back to transactions</Link></Button>}
    />
  );

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-3">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>
      <Breadcrumbs items={[{ label: "Transactions", to: "/transactions" }, { label: data.reference }]} />

      <PageHeader
        title={data.reference}
        description={`${data.demandCompany} · ${data.sourceProvider}`}
        actions={<StatusBadge status={data.status} />}
      />

      <MacroJourney current={data.currentStage} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="lifecycle">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
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

            <TabsContent value="quotes">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 font-display font-semibold">Provider quotes</h3>
                <ul className="space-y-2">
                  {data.quotes.map((q) => {
                    const isAccepted = acceptedId === q.id || q.status === "Accepted";
                    const status: StatusLabel = acceptedId
                      ? (isAccepted ? "Accepted" : "Rejected")
                      : q.status;
                    return (
                      <li key={q.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{q.providerName}</div>
                          <div className="text-xs text-muted-foreground">ETA {q.etaDays} days · <span className="tabular-nums">{fmt(q.priceZAR)}</span></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={status} />
                          {!acceptedId && q.status !== "Accepted" && (
                            <Button size="sm" variant="outline" onClick={() => { setAcceptedId(q.id); toast.success(`Accepted quote from ${q.providerName}. Service agreement generated.`); }}>
                              <Check className="mr-1 h-3.5 w-3.5" /> Accept
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {(acceptedId || data.quotes.some((q) => q.status === "Accepted")) && (
                  <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                    Quote accepted — service agreement available in the <strong>Agreement</strong> tab.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Linked documents</h3>
                  <Button asChild size="sm" variant="outline"><Link to="/documents">Manage documents</Link></Button>
                </div>
                {linkedDocs.length === 0 ? (
                  <EmptyState title="No documents linked yet" description="Documents attached to this transaction will appear here." icon={FileText} />
                ) : (
                  <ul className="divide-y">
                    {linkedDocs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{d.type}</div>
                            <div className="text-xs text-muted-foreground">v{d.version} · {d.uploadedBy}</div>
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
                  <Button size="sm" variant="outline" onClick={() => toast.success("Agreement download started (stub)")}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
                <div className="space-y-3 rounded-lg border bg-background/40 p-5 text-sm leading-relaxed">
                  <div className="text-center">
                    <div className="font-display text-lg font-semibold">SERVICE AGREEMENT</div>
                    <div className="text-xs text-muted-foreground">Reference {data.reference}</div>
                  </div>
                  <p>
                    This agreement is entered into between <strong>{data.demandCompany}</strong> ("Demand") and{" "}
                    <strong>{data.sourceProvider}</strong> ("Source") for the logistics movement of{" "}
                    <strong>{data.cargo}</strong> from <strong>{data.origin}</strong> to{" "}
                    <strong>{data.destination}</strong>, container <strong>{data.containerNo ?? "—"}</strong>{data.vessel ? `, vessel ${data.vessel}` : ""}.
                  </p>
                  <p>
                    Agreed value: <strong className="tabular-nums">{fmt(data.valueZAR)}</strong>. Standard SLAs and SOPs of the Vantage platform apply.
                    Compliance and SARS verification are performed against uploaded documentation.
                  </p>
                  <div className="grid grid-cols-2 gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <div>Signed (Demand)<br /><span className="font-medium text-foreground">{data.demandCompany}</span> · <em>e-signature placeholder</em></div>
                    <div>Signed (Source)<br /><span className="font-medium text-foreground">{data.sourceProvider}</span> · <em>e-signature placeholder</em></div>
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
                        <div className="text-xs text-muted-foreground">{e.actor} · {new Date(e.timestamp).toLocaleString("en-ZA")}</div>
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
              <Row icon={Package} label="Container" value={data.containerNo ?? "—"} />
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground">Cargo value</div>
                <div className="font-display text-xl font-semibold tabular-nums">{fmt(data.valueZAR)}</div>
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
