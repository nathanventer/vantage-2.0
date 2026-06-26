import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, PenLine, Archive } from "lucide-react";

const DOC_TYPES = [
  "Purchase Order", "Commercial Invoice", "Bill of Lading", "Customs Declaration",
  "Delivery Note", "Warehouse Receipt", "Transport Manifest", "Proof of Delivery",
  "SARS Clearing Document", "Proof of Service Completion", "Proof of Payment", "Transaction Summary",
];

const PIPELINE = ["Created", "Templates", "Uploaded", "Verified", "Approved", "SARS Verified", "E-signed", "Shared", "Archived"];

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents — Vantage" }] }),
  component: DocsPage,
});

function DocsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["doc"], queryFn: mockApi.listDocuments });

  return (
    <div>
      <PageHeader title="Document management" description="Document lifecycle from template to archive, with SARS verification and e-signatures." />

      <div className="mb-6 rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-display font-semibold">Document pipeline</h3>
        <div className="flex flex-wrap gap-2">
          {PIPELINE.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{p}</div>
              {i < PIPELINE.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 font-display font-semibold">Template library</h3>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {DOC_TYPES.map((t) => (
            <div key={t} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <FileText className="h-5 w-5 text-accent" />
                <Button size="sm" variant="ghost">Use</Button>
              </div>
              <div className="mt-2 text-sm font-medium">{t}</div>
              <div className="text-xs text-muted-foreground">Template · v1.2</div>
            </div>
          ))}
        </div>
      </div>

      <h3 className="mb-3 font-display font-semibold">Document register</h3>
      <div className="rounded-xl border bg-card">
        {isLoading ? <Skeleton className="h-72" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Uploaded by</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead>SARS</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.type}</TableCell>
                  <TableCell className="text-muted-foreground">{d.transactionRef}</TableCell>
                  <TableCell className="text-muted-foreground">{d.uploadedBy}</TableCell>
                  <TableCell>v{d.version}</TableCell>
                  <TableCell>{d.signed ? <StatusBadge status="Verified" /> : <StatusBadge status="Pending" />}</TableCell>
                  <TableCell>{d.sarsVerified ? <StatusBadge status="Verified" /> : <StatusBadge status="Pending" />}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, label: "Secure storage", desc: "Encrypted at rest, access-controlled retrieval." },
          { icon: PenLine, label: "E-signatures", desc: "Simulated for demo. Audit-trail captured per signer." },
          { icon: Archive, label: "Version & archive", desc: "Immutable version history with retrieval search." },
        ].map(({ icon: I, label, desc }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <I className="h-5 w-5 text-accent" />
            <div className="mt-2 font-medium">{label}</div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
