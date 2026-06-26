import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Vantage" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading } = useQuery({ queryKey: ["ae"], queryFn: mockApi.listAuditEvents });
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageHeader title="Audit log" description="Immutable record of governance, RBAC, and document events." />
      <div className="rounded-xl border bg-card divide-y">
        {(data ?? []).map((e) => (
          <div key={e.id} className="flex items-start gap-4 p-4">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground"><ScrollText className="h-4 w-4" /></div>
            <div className="flex-1">
              <div className="text-sm"><span className="font-medium">{e.actor}</span> · {e.action} <span className="text-muted-foreground">on</span> <span className="font-medium">{e.entity}</span></div>
              <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString("en-ZA")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
