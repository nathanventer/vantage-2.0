import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Truck, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/transport")({
  head: () => ({ meta: [{ title: "Transport — Vantage" }] }),
  component: TransportPage,
});

function TransportPage() {
  const { data, isLoading } = useQuery({ queryKey: ["tp"], queryFn: api.listTrips });
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageHeader
        title="Transport management"
        description="Trips, fleet assignment, simulated GPS tracking and proof of delivery."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2 text-accent">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display font-semibold">{t.reference}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.vehicle} · {t.driver}
                  </div>
                </div>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {t.origin} → {t.destination}
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{t.progressPct}%</span>
              </div>
              <Progress value={t.progressPct} className="h-1.5" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                GPS: {t.lat.toFixed(3)}, {t.lng.toFixed(3)}
              </span>
              <span>POD: {t.podUploaded ? "Uploaded" : "Pending"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
