import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShipmentPicker } from "@/components/dashboard/ShipmentPicker";
import { txnRefNumber } from "@/lib/references";
import type { LifecycleStep, MacroStage, Transaction } from "@/types";

/** Canonical 16 steps grouped into the 6 macro phases (mirrors stageFor: /3). */
const PHASES: { stage: MacroStage; steps: number }[] = [
  { stage: "Vessel", steps: 3 },
  { stage: "Port", steps: 3 },
  { stage: "Clearing", steps: 3 },
  { stage: "Transport", steps: 3 },
  { stage: "Warehouse", steps: 3 },
  { stage: "Delivery", steps: 1 },
];

function currentStepOf(steps: LifecycleStep[]): number {
  const inProgress = steps.find((s) => s.status === "In Progress");
  if (inProgress) return inProgress.index;
  const completed = steps.filter((s) => s.status === "Completed").length;
  return completed >= steps.length ? steps.length : completed; // 0 = not started
}

function phaseSlices(): { stage: MacroStage; from: number; to: number }[] {
  let cursor = 0;
  return PHASES.map((p) => {
    const from = cursor + 1;
    cursor += p.steps;
    return { stage: p.stage, from, to: cursor };
  });
}

function Segment({ step, current }: { step: LifecycleStep; current: number }) {
  const done = step.index < current || step.status === "Completed";
  const active = step.index === current && step.status !== "Completed";
  return (
    <div
      className="group/seg relative flex-1"
      title={`Step ${step.index} of 16 — ${step.label}`}
      aria-label={`Step ${step.index}: ${step.label} (${done ? "completed" : active ? "in progress" : "upcoming"})`}
    >
      <div
        className={cn(
          "h-1.5 rounded-full transition-all duration-300 ease-out",
          done && "bg-ok",
          active &&
            "bg-gradient-to-r from-brand to-brand-hover shadow-[0_0_10px_var(--color-brand)] animate-pulse",
          !done && !active && "bg-inset",
        )}
      />
    </div>
  );
}

export function LifecycleProgress({ transactions }: { transactions: Transaction[] }) {
  const ordered = useMemo(() => {
    const active = transactions.filter((t) => t.status !== "Closed");
    const pool = active.length ? active : transactions;
    return [...pool].sort((a, b) => {
      const na = txnRefNumber(a.reference);
      const nb = txnRefNumber(b.reference);
      if (na != null && nb != null && na !== nb) return na - nb;
      return a.reference.localeCompare(b.reference);
    });
  }, [transactions]);

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = useMemo(
    () => ordered.find((t) => t.id === selectedId) ?? ordered[0],
    [ordered, selectedId],
  );

  if (!selected) {
    return (
      <div className="glass flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center">
        <p className="text-sm font-medium">No shipments to track</p>
        <p className="max-w-[260px] text-xs text-muted-foreground">
          Create a shipment to follow its 16-step lifecycle here.
        </p>
      </div>
    );
  }

  const steps = selected.steps;
  const current = currentStepOf(steps);
  const slices = phaseSlices();
  const currentLabel = steps.find((s) => s.index === current)?.label ?? "Awaiting first step";
  const pct = Math.round((Math.max(current, 0) / steps.length) * 100);

  return (
    <div className="glass rounded-xl border p-5 sheen">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold tracking-tight">Shipment lifecycle</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={currentLabel}>
            Step {current || 0} of {steps.length} · {currentLabel}
          </p>
        </div>
        <ShipmentPicker
          transactions={ordered}
          value={selected.id}
          onChange={setSelectedId}
        />
      </div>

      {/* Horizontal phased progress (md+) */}
      <div className="hidden md:block">
        <div className="flex gap-2">
          {slices.map((slice) => {
            const phaseSteps = steps.filter((s) => s.index >= slice.from && s.index <= slice.to);
            const phaseDone = phaseSteps.every(
              (s) => s.index < current || s.status === "Completed",
            );
            const phaseActive = current >= slice.from && current <= slice.to;
            return (
              <div key={slice.stage} className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-1.5">
                  {phaseDone ? (
                    <Check aria-hidden className="h-3 w-3 shrink-0 text-ok" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        phaseActive ? "bg-brand" : "bg-muted-foreground/40",
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "truncate text-[11px] font-medium uppercase tracking-wide",
                      phaseActive ? "text-foreground" : "text-muted-foreground",
                    )}
                    title={slice.stage}
                  >
                    {slice.stage}
                  </span>
                </div>
                <div className="flex gap-1">
                  {phaseSteps.map((s) => (
                    <Segment key={s.index} step={s} current={current} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-inset">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Vertical variant (mobile) */}
      <ol className="space-y-2 md:hidden">
        {slices.map((slice) => {
          const phaseSteps = steps.filter((s) => s.index >= slice.from && s.index <= slice.to);
          const phaseActive = current >= slice.from && current <= slice.to;
          const phaseDone = phaseSteps.every((s) => s.index < current || s.status === "Completed");
          return (
            <li key={slice.stage} className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  phaseDone && "bg-ok text-ok-bg",
                  phaseActive && !phaseDone && "bg-brand text-brand-fg ring-4 ring-brand-soft",
                  !phaseActive && !phaseDone && "bg-inset text-muted-foreground",
                )}
              >
                {phaseDone ? <Check className="h-3.5 w-3.5" /> : slice.from}
              </div>
              <span
                className={cn(
                  "truncate text-sm",
                  phaseActive ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {slice.stage}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
