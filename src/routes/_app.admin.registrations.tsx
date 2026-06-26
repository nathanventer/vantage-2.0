import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { DetailDrawer } from "@/components/DetailDrawer";
import { GovernancePanel, type GovernanceItem } from "@/components/GovernancePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Registration, StatusLabel } from "@/types";

export const Route = createFileRoute("/_app/admin/registrations")({
  head: () => ({ meta: [{ title: "Registrations — Vantage" }] }),
  component: RegsPage,
});

function toGovItems(r: Registration): GovernanceItem[] {
  return r.governance.map((g) => ({
    item: g.item,
    status: (g.status === "Verified" ? "Verified" : g.status === "Failed" ? "Failed" : "Pending") as GovernanceItem["status"],
    optional: g.item.startsWith("B-BBEE"),
  }));
}

function RegsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reg"], queryFn: mockApi.listRegistrations });
  const [open, setOpen] = useState<Registration | null>(null);
  const [reason, setReason] = useState("");

  return (
    <div>
      <PageHeader title="Registration approvals" description="Review uploaded governance documents and approve or reject applicants." />
      <div className="rounded-xl border bg-card">
        {isLoading ? <Skeleton className="h-72" /> : (data ?? []).length === 0 ? (
          <EmptyState title="No registrations pending" description="New applicants will appear here for compliance review." icon={UserCheck} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sub-type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.id} className="h-14 cursor-pointer hover:bg-muted/40" onClick={() => { setOpen(r); setReason(""); }}>
                  <TableCell className="font-medium">{r.company}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-muted-foreground">{r.subType}</TableCell>
                  <TableCell className="text-muted-foreground">{r.contactName}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{new Date(r.submittedAt).toLocaleDateString("en-ZA")}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setOpen(r); setReason(""); }}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DetailDrawer
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open?.company ?? ""}
        description={open ? `${open.category} · ${open.subType} · submitted ${new Date(open.submittedAt).toLocaleDateString("en-ZA")}` : undefined}
        footer={open && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!reason.trim()) return toast.error("Provide a rejection reason.");
                toast.error(`${open.company} rejected — reason captured.`);
                setOpen(null);
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Reject
            </Button>
            <Button
              onClick={() => { toast.success(`${open.company} approved.`); setOpen(null); }}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
            </Button>
          </div>
        )}
      >
        {open && (
          <div className="space-y-5">
            <section>
              <h4 className="mb-2 text-sm font-semibold">Applicant contact</h4>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Contact</dt><dd>{open.contactName}</dd>
                <dt className="text-muted-foreground">Email</dt><dd>{open.contactEmail}</dd>
                <dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={open.status as StatusLabel} /></dd>
              </dl>
            </section>

            <GovernancePanel items={toGovItems(open)} title="Governance checks" description="Eight required checks (B-BBEE conditional)." />

            <section>
              <h4 className="mb-2 text-sm font-semibold">Reject reason (required to reject)</h4>
              <Label htmlFor="reason" className="sr-only">Rejection reason</Label>
              <Textarea id="reason" rows={3} placeholder="e.g. SARS registration expired — please re-upload." value={reason} onChange={(e) => setReason(e.target.value)} />
            </section>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
