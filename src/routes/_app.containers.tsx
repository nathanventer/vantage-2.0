import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Container, AlertTriangle, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/containers")({
  head: () => ({ meta: [{ title: "Containers — Vantage" }] }),
  component: ContainersPage,
});

function ContainersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["cn"], queryFn: mockApi.listContainerJobs });
  if (isLoading) return <Skeleton className="h-96" />;
  const c = data ?? [];
  const avgDwell = (c.reduce((s, x) => s + x.dwellDays, 0) / Math.max(1, c.length)).toFixed(1);
  return (
    <div>
      <PageHeader title="Container operations" description="Receiving, dispatch, inspections, stuffing/destuffing, damage and dwell-time." />
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Active containers" value={c.length} icon={Container} />
        <StatCard label="Avg dwell time" value={`${avgDwell} days`} icon={Clock} tone="warning" />
        <StatCard label="Damage reports" value={c.filter(x => x.damage).length} icon={AlertTriangle} tone="info" />
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Container No.</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Vessel</TableHead>
              <TableHead>Dwell</TableHead>
              <TableHead>Damage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="font-medium">{x.containerNo}</TableCell>
                <TableCell>{x.type}</TableCell>
                <TableCell className="text-muted-foreground">{x.vessel}</TableCell>
                <TableCell>{x.dwellDays} d</TableCell>
                <TableCell>{x.damage ? <StatusBadge status="Failed" /> : <StatusBadge status="Verified" />}</TableCell>
                <TableCell><StatusBadge status={x.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
