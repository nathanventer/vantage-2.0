import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { optimizer } from "@/adapters/optimizer";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/StatusChip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronRight, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { LifecycleStep, Transaction } from "@/types";

function activeStepOf(steps: LifecycleStep[]): LifecycleStep | undefined {
  return steps.find((s) => s.status === "In Progress");
}

function nextStepOf(steps: LifecycleStep[], current: number): LifecycleStep | undefined {
  return steps.find((s) => s.index === current + 1);
}

function allStepsComplete(steps: LifecycleStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.status === "Completed");
}

type LifecycleWorkflowProps = {
  transaction: Transaction;
  onStepAdvanced?: () => void;
};

function CelebrationBurst() {
  const dots = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-brand opacity-80"
          style={{
            animation: `lifecycle-confetti ${0.9 + (i % 5) * 0.1}s ease-out forwards`,
            animationDelay: `${(i % 8) * 40}ms`,
            transform: `rotate(${i * 15}deg) translateY(0)`,
            ["--burst-x" as string]: `${Math.cos((i / 24) * Math.PI * 2) * (60 + (i % 4) * 28)}px`,
            ["--burst-y" as string]: `${Math.sin((i / 24) * Math.PI * 2) * (60 + (i % 3) * 32)}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Demo-first lifecycle walkthrough: one-click approval per step, no document or
 * provider-selection gates — optimised for client showcases.
 */
export function LifecycleWorkflow({ transaction, onStepAdvanced }: LifecycleWorkflowProps) {
  const qc = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const celebratedRef = useRef(false);

  const active = activeStepOf(transaction.steps);
  const stepIndex = active?.index ?? transaction.steps.filter((s) => s.status === "Completed").length;
  const next = nextStepOf(transaction.steps, stepIndex);
  const complete = allStepsComplete(transaction.steps);

  const topQuoteId = useMemo(() => {
    const open = transaction.quotes.filter((q) => q.status !== "Rejected");
    if (open.length === 0) return null;
    return optimizer.score(
      open.map((q) => ({
        id: q.id,
        providerId: q.providerId,
        providerName: q.providerName,
        priceZAR: q.priceZAR,
        etaDays: q.etaDays,
      })),
    ).ranked[0]?.id;
  }, [transaction.quotes]);

  const anyAccepted = transaction.quotes.some((q) => q.status === "Accepted");

  useEffect(() => {
    if (complete && !celebratedRef.current) {
      celebratedRef.current = true;
      setShowCelebration(true);
    }
  }, [complete]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["tx", transaction.id] });
    void qc.invalidateQueries({ queryKey: ["tx"] });
    void qc.invalidateQueries({ queryKey: ["shipment-events", transaction.id] });
    void qc.invalidateQueries({ queryKey: ["ae"] });
  };

  const advanceMut = useMutation({
    mutationFn: async () => {
      if (active?.index === 4 && !anyAccepted && topQuoteId) {
        await api.selectQuote(transaction.id, topQuoteId);
      }
      await api.advanceShipmentStep(transaction.id, stepIndex + 1);
    },
    onSuccess: () => {
      const finishing = active?.index === 16;
      if (finishing) {
        celebratedRef.current = true;
        setShowCelebration(true);
      } else {
        const label = next ? `Step ${next.index}: ${next.label}` : "Lifecycle advanced";
        toast.success(`Approved — ${label}`);
      }
      invalidate();
      onStepAdvanced?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not advance step"),
  });

  return (
    <>
      <style>{`
        @keyframes lifecycle-confetti {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--burst-x)), calc(-50% + var(--burst-y))) scale(0.2);
          }
        }
        @keyframes lifecycle-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lifecycle-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      <div className="space-y-6">
        <LifecycleStepper steps={transaction.steps} />

        {active && !complete && (
          <div className="rounded-lg border border-brand/30 bg-brand-soft/30 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">Showcase step</p>
                <p className="font-medium">
                  {active.index}. {active.label}
                </p>
              </div>
              <StatusChip status={transaction.status} />
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              {next
                ? `Click approve to walk the client through step ${next.index}: ${next.label}. No uploads or extra actions required.`
                : "Approve to finish the lifecycle."}
            </p>

            <Button
              className="w-full sm:w-auto"
              size="lg"
              disabled={advanceMut.isPending}
              onClick={() => advanceMut.mutate()}
            >
              {advanceMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="mr-2 h-4 w-4" />
              )}
              Approve &amp; advance to step {stepIndex + 1}
            </Button>
          </div>
        )}

        {complete && (
          <p className="rounded-lg border border-ok-bd bg-ok-bg/40 p-4 text-sm text-ok">
            All 16 steps complete — transaction closed.
          </p>
        )}
      </div>

      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="max-w-md overflow-hidden border-ok-bd bg-card text-center sm:max-w-lg">
          <CelebrationBurst />
          <div className="relative z-10 flex w-full flex-col items-center py-2 text-center">
            <div className="relative mb-5">
              <span
                className="absolute inset-0 rounded-full bg-ok/30"
                style={{ animation: "lifecycle-ring 1.2s ease-out infinite" }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-ok text-success-foreground shadow-lg"
                style={{ animation: "lifecycle-pop 0.55s ease-out forwards" }}
              >
                <Check className="h-10 w-10 stroke-[3]" aria-hidden />
              </div>
            </div>

            <DialogHeader className="w-full items-center space-y-3 text-center sm:text-center">
              <DialogTitle className="w-full text-center font-display text-2xl font-bold tracking-tight">
                All 16 steps completed
              </DialogTitle>
              <DialogDescription className="mx-auto max-w-sm text-center text-base text-muted-foreground">
                <span className="mb-2 inline-flex items-center justify-center gap-1.5 font-medium text-foreground">
                  <PartyPopper className="h-4 w-4 shrink-0 text-brand" />
                  {transaction.reference}
                </span>
                <span className="block text-center">
                  The full Vessel → Delivery lifecycle is complete. Your client has seen every
                  milestone from request through payment and close.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="mx-auto mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-brand/30 bg-brand-soft/50 px-4 py-2 text-center text-sm font-medium text-brand">
              <Sparkles className="h-4 w-4 shrink-0" />
              Demo showcase ready
            </div>

            <DialogFooter className="mt-6 flex w-full flex-col items-center justify-center sm:justify-center">
              <Button className="w-full sm:w-auto" onClick={() => setShowCelebration(false)}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
