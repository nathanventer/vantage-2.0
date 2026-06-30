import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { documentRenderer, type RenderDoc } from "@/adapters";
import { useAuth } from "@/contexts/AuthContext";
import { PHASE1_TEMPLATES, PHASE2_TEMPLATES } from "@/lib/documents";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { DetailDrawer } from "@/components/DetailDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Eye, FilePlus2, FileText, Lock, PenLine, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { DocumentPayload, DocumentRecord, DocumentType } from "@/types";

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents — Vantage" }] }),
  component: DocsPage,
});

type Source = "templates" | "uploaded" | "all";
const SOURCES: { key: Source; label: string }[] = [
  { key: "templates", label: "Templates" },
  { key: "uploaded", label: "Uploaded" },
  { key: "all", label: "All" },
];

function buildRenderDoc(doc: DocumentRecord): RenderDoc {
  const p = doc.payload ?? {};
  const fields = [
    { label: "Document type", value: doc.type },
    { label: "Shipment", value: doc.transactionRef },
    { label: "Version", value: `v${doc.version}` },
    { label: "Status", value: doc.status },
    { label: "Counterparty", value: p.counterparty ? String(p.counterparty) : "—" },
    {
      label: "Amount",
      value: typeof p.amountZAR === "number" ? formatZAR(p.amountZAR) : "—",
    },
    { label: "Issued", value: p.issuedDate ? String(p.issuedDate) : "—" },
    { label: "Notes", value: p.notes ? String(p.notes) : "—" },
  ];
  if (doc.signedBy) {
    fields.push({
      label: "Signed by",
      value: `${doc.signedBy} (${doc.signatureToken ?? "signed"})`,
    });
  }
  return {
    title: doc.type,
    subtitle: "VANTAGE document",
    reference: doc.transactionRef,
    fields,
    footer: `Generated ${new Date().toLocaleString("en-ZA")} · ${doc.type} · v${doc.version}`,
  };
}

function DocsPage() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const docsQ = useQuery({ queryKey: ["doc"], queryFn: api.listDocuments });
  const txQ = useQuery({ queryKey: ["tx"], queryFn: api.listTransactions });

  const [source, setSource] = useState<Source>("uploaded");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [search, setSearch] = useState("");

  // Drawer state — handles both view/edit and create-from-template.
  const [mode, setMode] = useState<"closed" | "view" | "create">("closed");
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [createType, setCreateType] = useState<DocumentType | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DocumentPayload & { shipmentRef?: string }>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["doc"] });

  const createMut = useMutation({
    mutationFn: () =>
      api.createDocument({
        type: createType!,
        transactionRef: form.shipmentRef ?? txQ.data?.[0]?.reference ?? "—",
        payload: {
          counterparty: form.counterparty,
          amountZAR: form.amountZAR,
          issuedDate: form.issuedDate,
          notes: form.notes,
        },
      }),
    onSuccess: (doc) => {
      invalidate();
      setActiveDoc(doc);
      setMode("view");
      setEditing(false);
      toast.success(`${doc.type} created (${doc.transactionRef})`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create document"),
  });

  const versionMut = useMutation({
    mutationFn: (docId: string) =>
      api.versionDocument(docId, {
        counterparty: form.counterparty,
        amountZAR: form.amountZAR,
        issuedDate: form.issuedDate,
        notes: form.notes,
      }),
    onSuccess: (doc) => {
      invalidate();
      setActiveDoc(doc);
      setEditing(false);
      toast.success(`Saved v${doc.version}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save version"),
  });

  const signMut = useMutation({
    mutationFn: (docId: string) =>
      api.signDocument(docId, user?.fullName ?? "Authorized Signatory"),
    onSuccess: (doc) => {
      invalidate();
      setActiveDoc(doc);
      toast.success(`Signed by ${doc.signedBy}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not sign"),
  });

  const approveMut = useMutation({
    mutationFn: (docId: string) => api.approveDocument(docId),
    onSuccess: (doc) => {
      invalidate();
      setActiveDoc(doc);
      toast.success(`${doc.type} approved`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not approve"),
  });

  const docs = useMemo(() => docsQ.data ?? [], [docsQ.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (q && !`${d.type} ${d.transactionRef} ${d.uploadedBy}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [docs, typeFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, DocumentRecord[]>();
    for (const d of filtered) {
      const list = map.get(d.transactionRef) ?? [];
      list.push(d);
      map.set(d.transactionRef, list);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  function openView(doc: DocumentRecord) {
    setActiveDoc(doc);
    setForm({ ...(doc.payload ?? {}) });
    setEditing(false);
    setMode("view");
  }
  function openCreate(type: DocumentType) {
    setCreateType(type);
    setActiveDoc(null);
    setForm({ shipmentRef: txQ.data?.[0]?.reference });
    setMode("create");
  }
  function exportPdf(doc: DocumentRecord) {
    documentRenderer.download(buildRenderDoc(doc), `${doc.type}-${doc.transactionRef}`);
    toast.success("PDF exported");
  }

  return (
    <div>
      <PageHeader
        title="Document management"
        description="Templates, structured documents, versioning, e-signature and PDF export."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left rail */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div
            role="tablist"
            aria-label="Document source"
            className="inline-flex w-full rounded-lg border bg-inset p-0.5 text-sm"
          >
            {SOURCES.map((s) => (
              <button
                key={s.key}
                role="tab"
                type="button"
                aria-selected={source === s.key}
                onClick={() => setSource(s.key)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  source === s.key
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {source !== "templates" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="doc-search">Search</Label>
                <Input
                  id="doc-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type, shipment, party…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-type">Type</Label>
                <select
                  id="doc-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as DocumentType | "all")}
                  className="h-10 w-full rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All types</option>
                  {PHASE1_TEMPLATES.map((t) => (
                    <option key={t.db} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Lock className="h-3.5 w-3.5" /> Access control
            </div>
            <p className="mt-1.5">
              Documents are company-scoped. Editing creates a new version; admins approve and
              archive.
            </p>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 space-y-6">
          {source === "templates" ? (
            <>
              <section>
                <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Phase 1 templates
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {PHASE1_TEMPLATES.map((t) => (
                    <div
                      key={t.db}
                      className="flex flex-col rounded-xl border bg-card p-4 transition hover:shadow-sm"
                    >
                      <FileText className="h-5 w-5 text-brand" />
                      <div className="mt-2 truncate text-sm font-medium" title={t.label}>
                        {t.label}
                      </div>
                      <div className="text-xs text-muted-foreground">Structured · versioned</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => openCreate(t.label)}
                      >
                        <FilePlus2 className="mr-1.5 h-3.5 w-3.5" /> Use
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Logistics templates
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {PHASE2_TEMPLATES.map((t) => (
                    <div
                      key={t.db}
                      className="flex flex-col rounded-xl border border-dashed bg-inset/30 p-4 opacity-70"
                    >
                      <div className="flex items-center justify-between">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="rounded-full border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Phase 2
                        </span>
                      </div>
                      <div className="mt-2 truncate text-sm font-medium" title={t.label}>
                        {t.label}
                      </div>
                      <Button size="sm" variant="ghost" className="mt-3" disabled>
                        Coming soon
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : docsQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents match"
              description="Adjust the filter or create one from a template."
            />
          ) : (
            grouped.map(([ref, list]) => (
              <section key={ref} className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-display font-semibold" title={ref}>
                      {ref}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {list.length} document{list.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <ul className="divide-y">
                  {list.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium" title={d.type}>
                            {d.type}
                          </div>
                          <div className="text-[11px] tabular-nums text-muted-foreground">
                            v{d.version} · {d.uploadedBy}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusChip status={d.status} />
                        {d.signed && <StatusChip status="Verified" />}
                        <div className="flex items-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="View"
                            onClick={() => openView(d)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Export PDF"
                            onClick={() => exportPdf(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="E-sign"
                            disabled={d.signed || signMut.isPending}
                            onClick={() => signMut.mutate(d.id)}
                          >
                            <PenLine className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>

      <DetailDrawer
        open={mode !== "closed"}
        onOpenChange={(v) => !v && setMode("closed")}
        title={mode === "create" ? `New ${createType}` : (activeDoc?.type ?? "")}
        description={
          mode === "create"
            ? "Create a structured document from this template."
            : activeDoc
              ? `${activeDoc.transactionRef} · v${activeDoc.version} · ${activeDoc.status}`
              : undefined
        }
        footer={
          mode === "create" ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMode("closed")}>
                Cancel
              </Button>
              <Button disabled={createMut.isPending} onClick={() => createMut.mutate()}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> Create document
              </Button>
            </div>
          ) : activeDoc ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => exportPdf(activeDoc)}>
                <Download className="mr-1.5 h-4 w-4" /> Export PDF
              </Button>
              {editing ? (
                <Button
                  disabled={versionMut.isPending}
                  onClick={() => versionMut.mutate(activeDoc.id)}
                >
                  <Save className="mr-1.5 h-4 w-4" /> Save version
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <PenLine className="mr-1.5 h-4 w-4" /> Edit
                </Button>
              )}
              {role === "admin" && activeDoc.status !== "Approved" && (
                <Button
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate(activeDoc.id)}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Approve
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {mode === "create" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-ship">Shipment</Label>
              <select
                id="c-ship"
                value={form.shipmentRef ?? ""}
                onChange={(e) => setForm({ ...form, shipmentRef: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(txQ.data ?? []).map((t) => (
                  <option key={t.id} value={t.reference}>
                    {t.reference} — {t.origin} → {t.destination}
                  </option>
                ))}
              </select>
            </div>
            <PayloadForm value={form} onChange={setForm} />
          </div>
        )}

        {mode === "view" && activeDoc && (
          <div className="space-y-5">
            {editing ? (
              <PayloadForm value={form} onChange={setForm} />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Counterparty" value={activeDoc.payload?.counterparty} />
                <Field
                  label="Amount"
                  value={
                    typeof activeDoc.payload?.amountZAR === "number"
                      ? formatZAR(activeDoc.payload.amountZAR)
                      : undefined
                  }
                />
                <Field label="Issued" value={activeDoc.payload?.issuedDate} />
                <Field label="Notes" value={activeDoc.payload?.notes} full />
              </dl>
            )}

            <section>
              <h4 className="mb-2 text-sm font-semibold">Version history</h4>
              <ul className="space-y-2 text-sm">
                {Array.from({ length: activeDoc.version }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border bg-inset/40 px-3 py-2"
                  >
                    <span className="tabular-nums">v{i + 1}</span>
                    {i + 1 === activeDoc.version ? (
                      <StatusChip status={activeDoc.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">superseded</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold">E-signature</h4>
              {activeDoc.signed ? (
                <div className="rounded-lg border border-ok-bd bg-ok-bg/40 p-3 text-sm">
                  <div className="font-medium text-ok">Signed by {activeDoc.signedBy}</div>
                  <div className="text-xs text-muted-foreground">
                    {activeDoc.signatureToken} ·{" "}
                    {activeDoc.signedAt ? new Date(activeDoc.signedAt).toLocaleString("en-ZA") : ""}
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={signMut.isPending}
                  onClick={() => signMut.mutate(activeDoc.id)}
                >
                  <PenLine className="mr-1.5 h-4 w-4" /> E-sign (typed name)
                </Button>
              )}
            </section>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function PayloadForm({
  value,
  onChange,
}: {
  value: DocumentPayload & { shipmentRef?: string };
  onChange: (v: DocumentPayload & { shipmentRef?: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="p-party">Counterparty</Label>
        <Input
          id="p-party"
          value={value.counterparty ?? ""}
          onChange={(e) => onChange({ ...value, counterparty: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-amount">Amount (ZAR)</Label>
        <Input
          id="p-amount"
          type="number"
          value={value.amountZAR ?? ""}
          onChange={(e) => onChange({ ...value, amountZAR: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-date">Issued date</Label>
        <Input
          id="p-date"
          type="date"
          value={value.issuedDate ?? ""}
          onChange={(e) => onChange({ ...value, issuedDate: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-notes">Notes</Label>
        <textarea
          id="p-notes"
          rows={3}
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          className="w-full rounded-md border border-input bg-inset px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value?: unknown; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-2")}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{value ? String(value) : "—"}</dd>
    </div>
  );
}
