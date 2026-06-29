import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_app/requests")({
  head: () => ({ meta: [{ title: "Incoming Requests — Vantage" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["req"], queryFn: api.listShipmentRequests });
  return (
    <div>
      <PageHeader title="Incoming requests" description="New shipment requests routed to your operation. Accept or submit a quote." />
      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
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
                  <TableCell className="font-medium">{r.id.toUpperCase()}</TableCell>
                  <TableCell>{r.demandCompany}</TableCell>
                  <TableCell className="text-muted-foreground">{r.origin} → {r.destination}</TableCell>
                  <TableCell>{r.cargo}</TableCell>
                  <TableCell>{r.weightTons} t</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => toast.success("Quote submitted")} className="mr-2">
                      <Check className="mr-1 h-3.5 w-3.5" /> Quote
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.info("Request declined")}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
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
