import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { DetailDrawer } from "@/components/DetailDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Clock, UserCheck, Search } from "lucide-react";
import { toast } from "sonner";
import type { Registration } from "@/types";

export const Route = createFileRoute("/_app/admin/registrations")({
  head: () => ({ meta: [{ title: "Registrations — Vantage" }] }),
  component: RegsPage,
});

const CHECKLIST_ITEMS = [
  "Company Registration",
  "Tax Clearance",
  "Banking Proof",
  "Director ID",
  "SARS Registration",
  "Insurance",
  "Operating Licence",
  "B-BBEE",
];

type Tab = "Pending" | "Approved" | "Rejected" | "All";
const TABS: Tab[] = ["Pending", "Approved", "Rejected", "All"];

function inTab(r: Registration, tab: Tab): boolean {
  if (tab === "All") return true;
  if (tab === "Pending") return r.status === "Pending" || r.status === "Under Review";
  return r.status === tab;
}

function RegsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["reg"], queryFn: api.listRegistrations });
  const [tab, setTab] = useState<Tab>("Pending");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Registration | null>(null);
  const [reason, setReason] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter(
      (r) => inTab(r, tab) && (term === "" || r.company.toLowerCase().includes(term)),
    );
  }, [data, tab, q]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      Pending: all.filter((r) => inTab(r, "Pending")).length,
      Approved: all.filter((r) => r.status === "Approved").length,
      Rejected: all.filter((r) => r.status === "Rejected").length,
      All: all.length,
    } as Record<Tab, number>;
  }, [data]);

  function review(r: Registration) {
    setOpen(r);
    setReason(r.rejectionReason ?? "");
    setChecklist(r.verificationChecklist ?? {});
  }

  async function act(fn: () => Promise<void>, msg: string) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["reg"] });
      toast.success(msg);
      setOpen(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCheck(item: string, value: boolean) {
    if (!open) return;
    const next = { ...checklist, [item]: value };
    setChecklist(next);
    try {
      await api.updateVerificationChecklist(open.companyId, next);
    } catch {
      toast.error("Could not save checklist");
    }
  }

  const docTotal = open?.docTotal ?? 8;
  const docCount = open?.docCount ?? open?.governance.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Registration approvals"
        description="Manually review uploaded compliance documents and approve, reject, or hold each applicant."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
                <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[t]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company…"
            className="h-9 rounded-full pl-9"
            aria-label="Search registrations"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-md">
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description={`No ${tab.toLowerCase()} registrations.`}
            icon={UserCheck}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Documents</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="h-14 cursor-pointer transition-colors hover:bg-surface-2"
                    onClick={() => review(r)}
                  >
                    <TableCell className="max-w-[260px] truncate font-medium" title={r.company}>
                      {r.company}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.category} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.docCount ?? r.governance.length}/{r.docTotal ?? 8}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {new Date(r.submittedAt).toLocaleDateString("en-ZA")}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          review(r);
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <DetailDrawer
        open={!!open}
        onOpenChange={(v) => !v && setOpen(null)}
        title={open?.company ?? ""}
        description={
          open
            ? `${open.category} · ${open.subType} · submitted ${new Date(open.submittedAt).toLocaleDateString("en-ZA")}`
            : undefined
        }
        footer={
          open && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  act(() => api.setCompanyPending(open.companyId), `${open.company} kept pending`)
                }
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" /> Keep pending
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (!reason.trim()) return toast.error("A rejection reason is required.");
                  act(
                    () => api.rejectCompany(open.companyId, reason.trim()),
                    `${open.company} rejected`,
                  );
                }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  act(() => api.approveCompany(open.companyId), `${open.company} approved`)
                }
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
              </Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-6">
            <section>
              <h4 className="mb-2 text-sm font-semibold">Applicant</h4>
              <dl className="grid grid-cols-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="col-span-2 truncate" title={open.contactName}>
                  {open.contactName}
                </dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="col-span-2 truncate" title={open.contactEmail}>
                  {open.contactEmail}
                </dd>
                <dt className="text-muted-foreground">Documents</dt>
                <dd className="col-span-2 tabular-nums">
                  {docCount}/{docTotal} uploaded
                </dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="col-span-2">
                  <StatusChip status={open.status} />
                </dd>
              </dl>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold">Verification checklist</h4>
              <p className="mb-3 text-xs text-muted-foreground">
                Tick each requirement you have manually confirmed against the uploaded documents.
              </p>
              <ul className="space-y-1.5">
                {CHECKLIST_ITEMS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 rounded-lg border bg-inset px-3 py-2"
                  >
                    <Checkbox
                      id={`chk-${item}`}
                      checked={!!checklist[item]}
                      onCheckedChange={(v) => toggleCheck(item, v === true)}
                    />
                    <Label
                      htmlFor={`chk-${item}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {item}
                    </Label>
                    {checklist[item] && <StatusChip status="verified" />}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold">Rejection reason</h4>
              <Label htmlFor="reason" className="sr-only">
                Rejection reason
              </Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Required to reject — e.g. SARS registration expired, please re-upload."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </section>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
