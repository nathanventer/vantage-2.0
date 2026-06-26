import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { MacroJourney } from "@/components/MacroJourney";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ship, MapPin, Package, Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/transactions/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — Vantage` }] }),
  component: TxDetail,
  notFoundComponent: () => <div className="p-6">Transaction not found.</div>,
});

function TxDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["tx", id], queryFn: () => mockApi.getTransaction(id) });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <p className="text-muted-foreground">Transaction not found.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/transactions">Back to list</Link></Button>
    </div>
  );

  const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.history.back()} className="mb-3">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      <PageHeader
        title={data.reference}
        description={`${data.demandCompany} · ${data.sourceProvider}`}
        actions={<StatusBadge status={data.status} className="text-sm" />}
      />

      <MacroJourney current={data.currentStage} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 font-display font-semibold">Lifecycle</h3>
            <LifecycleStepper steps={data.steps} />
          </div>
        </div>

        <div className="space-y-4">
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
                <div className="font-display text-xl font-semibold">{fmt(data.valueZAR)}</div>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display font-semibold">Quotes</h3>
            <ul className="space-y-2">
              {data.quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{q.providerName}</div>
                    <div className="text-xs text-muted-foreground">ETA {q.etaDays} days · {fmt(q.priceZAR)}</div>
                  </div>
                  <StatusBadge status={q.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Ship; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  );
}
