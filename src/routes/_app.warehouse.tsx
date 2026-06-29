import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/warehouse")({
  head: () => ({ meta: [{ title: "Warehouse — Vantage" }] }),
  component: WarehousePage,
});

const TYPES = ["Bonded", "General", "Clearing", "Cross-docking"] as const;

function WarehousePage() {
  const { data, isLoading } = useQuery({ queryKey: ["wh"], queryFn: api.listWarehouseJobs });
  if (isLoading) return <Skeleton className="h-96" />;
  const jobs = data ?? [];

  return (
    <div>
      <PageHeader title="Warehouse management" description="Job board for bonded, general, clearing and cross-docking operations." />
      <Tabs defaultValue="Bonded">
        <TabsList>
          {TYPES.map((t) => (
            <TabsTrigger key={t} value={t}>{t} ({jobs.filter(j => j.warehouseType === t).length})</TabsTrigger>
          ))}
        </TabsList>
        {TYPES.map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {jobs.filter(j => j.warehouseType === t).map((j) => (
                <div key={j.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display font-semibold">{j.reference}</div>
                      <div className="text-xs text-muted-foreground">{j.client} · {j.location}</div>
                    </div>
                    <StatusBadge status={j.status} />
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {j.checklist.map((c) => (
                      <li key={c.step} className="flex items-center gap-2 text-sm">
                        <div className={cn("flex h-4 w-4 items-center justify-center rounded-full", c.done ? "bg-success text-success-foreground" : "border border-border")}>
                          {c.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 text-transparent" />}
                        </div>
                        <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
