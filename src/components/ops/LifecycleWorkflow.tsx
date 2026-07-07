import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { DOC_DB_TO_LABEL, STEP_REQUIRED_DOCS } from "@/lib/documents";
import { formatZAR } from "@/lib/format";
import { optimizer } from "@/adapters/optimizer";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/StatusChip";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { LifecycleStep, Transaction } from "@/types";

function activeStepOf(steps: LifecycleStep[]): LifecycleStep | undefined {
  return steps.find((s) => s.status === "In Progress");
}

function nextStepOf(steps: LifecycleStep[], current: number): LifecycleStep | undefined {
  return steps.find((s) => s.index === current + 1);
}

/** Demand-led steps; source handles execution milestones. Admins can do all. */
function canApproveStep(role: string, stepIndex: number): boolean {
  if (role === "admin") return true;
  if (role === "demand") return [1, 2, 3, 4, 5, 6, 7, 15, 16].includes(stepIndex);
  if (role === "source") return [3, 8, 9, 10, 11, 12, 13, 14].includes(stepIndex);
  return false;
}

type LifecycleWorkflowProps = {
  transaction: Transaction;
  onQuoteAccepted?: () => void;
};

export function LifecycleWorkflow({ transaction, onQuoteAccepted }: LifecycleWorkflowProps) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const docsQ = useQuery({ queryKey: ["doc"], queryFn: api.listDocuments });

  const active = activeStepOf(transaction.steps);
  const stepIndex = active?.index ?? transaction.steps.filter((s) => s.status === "Completed").length;
  const next = nextStepOf(transaction.steps, stepIndex);
  const atEnd = stepIndex >= transaction.steps.length;

  const linkedDocTypes = useMemo(
    () =>
      new Set(
        (docsQ.data ?? [])
          .filter((d) => d.transactionRef === transaction.reference)
          .map((d) => d.type),
      ),
    [docsQ.data, transaction.reference],
  );

  const missingDocs = (STEP_REQUIRED_DOCS[stepIndex] ?? [])
    .map((db) => DOC_DB_TO_LABEL[db])
    .filter((label) => !linkedDocTypes.has(label));
  const blockedByDocs = missingDocs.length > 0;

  const rankedQuotes = useMemo(() => {
    const open = transaction.quotes.filter((q) => q.status !== "Rejected");
    if (open.length === 0) return [];
    return optimizer.score(
      open.map((q) => ({
        id: q.id,
        providerId: q.providerId,
        providerName: q.providerName,
        priceZAR: q.priceZAR,
        etaDays: q.etaDays,
      })),
    ).ranked;
  }, [transaction.quotes]);

  const anyAccepted = transaction.quotes.some((q) => q.status === "Accepted");
  const canApprove = active ? canApproveStep(role, active.index) : false;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["tx", transaction.id] });
    void qc.invalidateQueries({ queryKey: ["tx"] });
    void qc.invalidateQueries({ queryKey: ["shipment-events", transaction.id] });
    void qc.invalidateQueries({ queryKey: ["ae"] });
  };

  const advanceMut = useMutation({
    mutationFn: () => api.advanceShipmentStep(transaction.id, stepIndex + 1),
    onSuccess: () => {
      toast.success(
        next ? `Approved — now at step ${next.index}: ${next.label}` : "Lifecycle advanced",
      );
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not advance step"),
  });

  const acceptMut = useMutation({
    mutationFn: (quoteId: string) => api.selectQuote(transaction.id, quoteId),
    onSuccess: () => {
      toast.success("Provider confirmed — advance to the next step when ready.");
      invalidate();
      onQuoteAccepted?.();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Unable to confirm provider"),
  });

  const showQuotePicker = active?.index === 4 && !anyAccepted && rankedQuotes.length > 0;

  return (
    <div className="space-y-6">
      <LifecycleStepper steps={transaction.steps} />

      {active && (
        <div className="rounded-lg border border-brand/30 bg-brand-soft/30 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Current step</p>
              <p className="font-medium">
                {active.index}. {active.label}
              </p>
            </div>
            <StatusChip status={transaction.status} />
          </div>

          {showQuotePicker && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Confirm your provider to complete this step. The Optimizer recommendation is pinned
                first.
              </p>
              {rankedQuotes.map((q, i) => (
                <div
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{q.providerName}</span>
                      {i === 0 && (
                        <span className="rounded-full border border-ok-bd bg-ok-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Score {q.totalScore}/100 · ETA {q.etaDays} days · Rank #{q.rank}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold tabular-nums">
                      {formatZAR(q.priceZAR)}
                    </span>
                    <Button
                      size="sm"
                      disabled={acceptMut.isPending}
                      onClick={() => acceptMut.mutate(q.id)}
                    >
                      {acceptMut.isPending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      )}
                      Confirm
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!atEnd && canApprove && !showQuotePicker && (
            <div className="space-y-2">
              {blockedByDocs ? (
                <p className="text-sm text-warning">
                  Upload required documents before advancing: {missingDocs.join(", ")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {next
                    ? `Approve to move to step ${next.index}: ${next.label}`
                    : "Approve to continue the workflow."}
                </p>
              )}
              <Button
                className="w-full sm:w-auto"
                disabled={blockedByDocs || advanceMut.isPending}
                onClick={() => advanceMut.mutate()}
              >
                {advanceMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                Approve &amp; advance
              </Button>
            </div>
          )}

          {!canApprove && !showQuotePicker && (
            <p className="text-sm text-muted-foreground">
              This step is handled by your{" "}
              {active.index >= 8 && active.index <= 14 ? "logistics provider" : "operations team"}.
              Switch to the Operations tab or use a provider account to advance execution
              milestones.
            </p>
          )}

          {atEnd && (
            <p className="text-sm text-ok">Lifecycle complete — transaction closed.</p>
          )}
        </div>
      )}
    </div>
  );
}
