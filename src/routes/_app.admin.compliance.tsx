import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { GovernancePanel } from "@/components/GovernancePanel";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, ShieldCheck, AlertOctagon } from "lucide-react";

export const Route = createFileRoute("/_app/admin/compliance")({
  head: () => ({ meta: [{ title: "Compliance — Vantage" }] }),
  component: CompPage,
});

function CompPage() {
  const { data, isLoading } = useQuery({ queryKey: ["cf"], queryFn: api.listComplianceFlags });
  if (isLoading) return <Skeleton className="h-96" />;
  const flags = data ?? [];

  return (
    <div>
      <PageHeader title="Compliance dashboard" description="Verification status across users, flagged issues, and CAPA monitoring." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="High severity" value={flags.filter(f => f.severity === "High").length} icon={AlertOctagon} tone="warning" />
        <StatCard label="Open flags" value={flags.filter(f => f.status === "Open").length} icon={ShieldAlert} tone="info" />
        <StatCard label="Closed" value={flags.filter(f => f.status === "Closed").length} icon={ShieldCheck} tone="success" />
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">Flag queue</TabsTrigger>
          <TabsTrigger value="governance">Governance overview</TabsTrigger>
        </TabsList>
        <TabsContent value="flags">
          <div className="rounded-xl border bg-card">
            {flags.length === 0 ? (
              <EmptyState title="No flags raised" description="Compliance issues will appear here for triage." icon={ShieldCheck} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Noted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map((f) => (
                    <TableRow key={f.id} className="h-14">
                      <TableCell className="font-medium">{f.entity}</TableCell>
                      <TableCell>{f.area}</TableCell>
                      <TableCell><StatusBadge status={f.severity === "High" ? "Failed" : f.severity === "Medium" ? "Pending" : "Verified"} /></TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{new Date(f.notedAt).toLocaleDateString("en-ZA")}</TableCell>
                      <TableCell><StatusBadge status={f.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
        <TabsContent value="governance">
          <GovernancePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
