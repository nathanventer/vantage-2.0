import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Dropzone } from "@/components/Dropzone";
import { DetailDrawer } from "@/components/DetailDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, PenLine, Archive, Eye, History, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentRecord } from "@/types";

const DOC_TYPES = [
  "Purchase Order", "Commercial Invoice", "Bill of Lading", "Customs Declaration",
  "Delivery Note", "Warehouse Receipt", "Transport Manifest", "Proof of Delivery",
  "SARS Clearing Document", "Proof of Service Completion", "Proof of Payment", "Transaction Summary",
];

const PIPELINE = ["Created", "Templates", "Uploaded", "Verified", "Approved", "SARS Verified", "E-signed", "Shared", "Archived"];

type FilterKey = "All" | "Templates" | "Uploaded" | "Signed" | "SARS verified" | "Archived";
const FILTERS: FilterKey[] = ["All", "Uploaded", "Signed", "SARS verified", "Archived"];

const PERMISSIONS = [
  { role: "Demand", view: true, upload: true, sign: true, archive: false },
  { role: "Source", view: true, upload: true, sign: true, archive: false },
  { role: "Admin",  view: true, upload: false, sign: false, archive: true },
];

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents — Vantage" }] }),
  component: DocsPage,
});

function DocsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["doc"], queryFn: mockApi.listDocuments });
  const [filter, setFilter] = useState<FilterKey>("All");
  const [openDoc, setOpenDoc] = useState<DocumentRecord | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    switch (filter) {
      case "Signed": return list.filter((d) => d.signed);
      case "SARS verified": return list.filter((d) => d.sarsVerified);
      case "Archived": return list.filter((d) => d.status === "Approved");
      case "Uploaded": return list.filter((d) => d.status === "Submitted" || d.status === "Verified");
      default: return list;
    }
  }, [data, filter]);

  return (
    <div>
      <PageHeader title="Document management" description="Document lifecycle from template to archive, with SARS verification and e-signatures." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Document pipeline</h3>
            <div className="flex flex-wrap gap-2">
              {PIPELINE.map((p, i) => (
                <div key={p} className="flex items-center gap-2">
                  <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{p}</div>
                  {i < PIPELINE.length - 1 && <span className="text-muted-foreground" aria-hidden>→</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Template library</h3>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {DOC_TYPES.map((t) => (
                <div key={t} className="rounded-xl border bg-card p-4 transition hover:shadow-sm">
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

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Document register</h3>
              <div role="tablist" aria-label="Filter documents" className="inline-flex rounded-full border bg-muted/40 p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition",
                      filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card">
              {isLoading ? <Skeleton className="h-72" /> : filtered.length === 0 ? (
                <EmptyState title="No documents match this filter" description="Try a different filter or upload a document." icon={FileText} />
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Uploaded by</TableHead>
                        <TableHead className="text-right">Version</TableHead>
                        <TableHead className="w-px">Signed</TableHead>
                        <TableHead className="w-px">SARS</TableHead>
                        <TableHead className="w-px">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((d) => (
                        <TableRow key={d.id} className="h-14">
                          <TableCell className="font-medium">{d.type}</TableCell>
                          <TableCell className="text-muted-foreground">{d.transactionRef}</TableCell>
                          <TableCell className="text-muted-foreground">{d.uploadedBy}</TableCell>
                          <TableCell className="text-right tabular-nums">v{d.version}</TableCell>
                          <TableCell><StatusBadge status={d.signed ? "Verified" : "Pending"} /></TableCell>
                          <TableCell><StatusBadge status={d.sarsVerified ? "Verified" : "Pending"} /></TableCell>
                          <TableCell><StatusBadge status={d.status} /></TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" aria-label="View document" onClick={() => setOpenDoc(d)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" aria-label="Version history" onClick={() => setOpenDoc(d)}>
                              <History className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display text-sm font-semibold">Upload documents</h3>
            <Dropzone hint="PDF / image up to 10 MB · auto-verified" />
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-display text-sm font-semibold">Access permissions</h3>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Upload</TableHead>
                    <TableHead className="text-center">Sign</TableHead>
                    <TableHead className="text-center">Archive</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSIONS.map((p) => (
                    <TableRow key={p.role}>
                      <TableCell className="font-medium">{p.role}</TableCell>
                      {(["view", "upload", "sign", "archive"] as const).map((k) => (
                        <TableCell key={k} className="text-center text-muted-foreground">{p[k] ? "✓" : "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </aside>
      </div>

      <DetailDrawer
        open={!!openDoc}
        onOpenChange={(v) => !v && setOpenDoc(null)}
        title={openDoc?.type ?? ""}
        description={openDoc ? `${openDoc.transactionRef} · v${openDoc.version}` : undefined}
      >
        {openDoc && (
          <div className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Document preview</div>
              <p className="mt-2 text-muted-foreground">A rendered preview of <strong>{openDoc.type}</strong> would appear here. (Preview omitted in the demo build.)</p>
            </div>

            <section>
              <h4 className="mb-2 text-sm font-semibold">Version history</h4>
              <ul className="space-y-2 text-sm">
                {Array.from({ length: openDoc.version }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                    <div>v{i + 1} <span className="ml-2 text-xs text-muted-foreground">{openDoc.uploadedBy}</span></div>
                    {i + 1 === openDoc.version ? <StatusBadge status="Verified" /> : <StatusBadge status="Closed" />}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold">Audit trail</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { icon: FileText, text: "Document created from template", who: "system" },
                  { icon: ShieldCheck, text: "Compliance verification passed", who: "compliance@vantage" },
                  { icon: PenLine, text: openDoc.signed ? "E-signature captured" : "Awaiting signature", who: openDoc.signed ? openDoc.uploadedBy : "—" },
                  { icon: Archive, text: openDoc.status === "Approved" ? "Archived to secure storage" : "Pending archive", who: "system" },
                ].map((row, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-accent/10 p-1.5 text-accent"><row.icon className="h-3.5 w-3.5" /></div>
                    <div className="flex-1">
                      <div>{row.text}</div>
                      <div className="text-xs text-muted-foreground">{row.who}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <ScrollText className="mb-1 inline h-3.5 w-3.5" /> Access scoped to Demand, Source and Admin per the permissions matrix.
            </section>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
