import type { LifecycleStep, MacroStage } from "@/types";

export const STEP_LABELS = [
  "Shipment request created",
  "Providers matched",
  "Quotes / acceptance",
  "Provider confirmed",
  "Transaction record created",
  "Service agreement generated",
  "Documentation uploaded",
  "Cargo collection",
  "Port & customs processing",
  "Warehouse operations",
  "Transport scheduling",
  "Final delivery",
  "POD uploaded",
  "Invoice generated",
  "Payment processed",
  "Transaction closed",
];

const MACRO_STAGES: MacroStage[] = [
  "Vessel",
  "Port",
  "Clearing",
  "Transport",
  "Warehouse",
  "Delivery",
];

/** Build the canonical 16 lifecycle steps for a given 1-based current step. */
export function makeLifecycleSteps(currentStep: number): LifecycleStep[] {
  const done = currentStep - 1;
  return STEP_LABELS.map((label, idx) => ({
    index: idx + 1,
    label,
    status: idx < done ? "Completed" : idx === done ? "In Progress" : "Pending",
  }));
}

/** Map a 1–16 lifecycle step onto its macro stage (even 6-way split). */
export function macroForStep(step: number): MacroStage {
  const idx = Math.min(5, Math.max(0, Math.floor(((step - 1) / 16) * 6)));
  return MACRO_STAGES[idx];
}

/** Current 1-based step for a shipment: the In-Progress step, else completed+1. */
export function currentStepOf(steps: LifecycleStep[]): number {
  const inProgress = steps.find((s) => s.status === "In Progress");
  if (inProgress) return inProgress.index;
  const completed = steps.filter((s) => s.status === "Completed").length;
  return Math.min(STEP_LABELS.length, completed + 1);
}
