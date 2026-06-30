import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/privacy")({
  head: () => ({ meta: [{ title: "Data & privacy — Vantage" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const [reason, setReason] = useState("");

  const exportMut = useMutation({
    mutationFn: () => api.exportMyData(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vantage-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data export was downloaded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Export failed"),
  });

  const erasureMut = useMutation({
    mutationFn: () => api.requestErasure(reason.trim()),
    onSuccess: () => {
      setReason("");
      toast.success("Erasure request recorded for admin review");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  return (
    <div>
      <PageHeader
        title="Data & privacy"
        description="Exercise your POPIA data-subject rights — access and erasure."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Right of access */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand">
            <ShieldCheck className="h-4 w-4" /> Right of access
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">Download my data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Compiles the records associated with your account — transactions, documents and invoices
            visible to you — into a single JSON file (POPIA §23).
          </p>
          <Button
            className="mt-4"
            disabled={exportMut.isPending}
            onClick={() => exportMut.mutate()}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {exportMut.isPending ? "Preparing…" : "Download my data"}
          </Button>
        </section>

        {/* Right to erasure */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-err">
            <Trash2 className="h-4 w-4" /> Right to erasure
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold">Request data erasure</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Records a deletion request for admin review. Trade records under a legal retention
            obligation (e.g. SARS) may be retained until the obligation lapses (POPIA §24).
          </p>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="erasure-reason">Reason</Label>
            <textarea
              id="erasure-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you requesting erasure?"
              className="w-full rounded-md border border-input bg-inset px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button
            variant="outline"
            className="mt-3 border-err/40 text-err hover:bg-err/10"
            disabled={!reason.trim() || erasureMut.isPending}
            onClick={() => erasureMut.mutate()}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Request erasure
          </Button>
        </section>
      </div>
    </div>
  );
}
