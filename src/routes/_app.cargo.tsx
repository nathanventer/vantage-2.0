import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/cargo")({
  head: () => ({ meta: [{ title: "Cargo Handling — Vantage" }] }),
  component: CargoPage,
});

function CargoPage() {
  const { data, isLoading } = useQuery({ queryKey: ["cg"], queryFn: api.listCargoHandling });
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageHeader
        title="Cargo handling"
        description="Bulk handling, palletising, weighbridge, loading/offloading and condition reports."
      />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.reference}</TableCell>
                <TableCell>{c.operation}</TableCell>
                <TableCell>{c.weightKg.toLocaleString("en-ZA")} kg</TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      c.condition === "Good"
                        ? "Verified"
                        : c.condition === "Damaged"
                          ? "Failed"
                          : "Pending"
                    }
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(c.timestamp).toLocaleString("en-ZA")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
