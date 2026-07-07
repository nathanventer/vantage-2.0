import type { CargoHandling, ContainerJob, Trip, WarehouseJob } from "@/types";

export type ReportPeriod = "30" | "90" | "ytd";

export function withinPeriod(iso: string | undefined, period: ReportPeriod): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === "ytd") return d.getFullYear() === now.getFullYear();
  const days = Number(period);
  return now.getTime() - d.getTime() <= days * 86_400_000;
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : -1;
}

function avgScores(scores: number[]): number {
  const valid = scores.filter((s) => s >= 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/** Good condition among assessed records (excludes Pending Inspection). */
export function assessedGoodPct(records: CargoHandling[]): number {
  const assessed = records.filter((r) => r.condition !== "Pending Inspection");
  if (!assessed.length) {
    if (!records.length) return -1;
    return pct(records.filter((r) => r.condition === "Good").length, records.length);
  }
  return pct(
    assessed.filter((r) => r.condition === "Good").length,
    assessed.length,
  );
}

/** Checklist step completion rate across jobs (first matching step name). */
export function stepCompletionPct(jobs: WarehouseJob[], stepNames: string[]): number {
  if (!jobs.length || !stepNames.length) return -1;
  let done = 0;
  for (const job of jobs) {
    const step = job.checklist.find((s) => stepNames.includes(s.step));
    if (step?.done) done += 1;
  }
  return pct(done, jobs.length);
}

/** Share of container jobs without a damage flag. */
export function containerIntactPct(
  jobs: ContainerJob[],
  types: ContainerJob["type"][],
): number {
  const subset = jobs.filter((j) => types.includes(j.type));
  if (!subset.length) return -1;
  return pct(subset.filter((j) => !j.damage).length, subset.length);
}

export interface ProductivityArea {
  area: string;
  v: number;
}

/** Warehouse workflow stages mapped to cargo ops + container job types. */
export const PRODUCTIVITY_AREAS = [
  {
    area: "Receiving",
    cargoOps: ["Bulk Handling"] as const,
    whSteps: ["Receive & tally", "Cargo received"],
    containerTypes: ["Receiving"] as const,
  },
  {
    area: "Destuffing",
    cargoOps: ["Offloading"] as const,
    whSteps: ["Quality inspection", "Destuffing", "Container inspection"],
    containerTypes: ["Destuffing"] as const,
  },
  {
    area: "Palletising",
    cargoOps: ["Palletising"] as const,
    whSteps: ["Put-away / stage", "Palletising", "Inventory allocated"],
    containerTypes: ["Stuffing"] as const,
  },
  {
    area: "Dispatch",
    cargoOps: ["Loading"] as const,
    whSteps: ["Release for delivery", "Dispatch scheduled", "Transport handover"],
    containerTypes: ["Dispatch"] as const,
  },
  {
    area: "Weighbridge",
    cargoOps: ["Weighbridge"] as const,
    whSteps: [] as const,
    containerTypes: [] as const,
  },
] as const;

/**
 * Productivity index per operational area — averaged across every signal
 * available in the system for that stage (cargo condition, warehouse checklist,
 * container integrity). Aligns the chart with warehouse utilisation and the
 * ops tables elsewhere in the app.
 */
export function computeProductivityIndex(
  cargo: CargoHandling[],
  warehouseJobs: WarehouseJob[],
  containers: ContainerJob[],
  period: ReportPeriod,
): ProductivityArea[] {
  const cargoP = cargo.filter((c) => withinPeriod(c.timestamp, period));
  const whP = warehouseJobs.filter((j) => withinPeriod(j.createdAt, period));
  const contP = containers.filter((c) => withinPeriod(c.createdAt, period));

  return PRODUCTIVITY_AREAS.map(({ area, cargoOps, whSteps, containerTypes }) => {
    const scores: number[] = [];
    const cargoSubset = cargoP.filter((c) =>
      (cargoOps as readonly string[]).includes(c.operation),
    );
    const cg = assessedGoodPct(cargoSubset);
    if (cg >= 0) scores.push(cg);
    const wh = stepCompletionPct(whP, [...whSteps]);
    if (wh >= 0) scores.push(wh);
    const ct = containerIntactPct(contP, [...containerTypes]);
    if (ct >= 0) scores.push(ct);
    return { area, v: avgScores(scores) };
  });
}

export interface OperationalKpis {
  whUtil: number;
  fleetUtil: number;
  avgDwell: number;
  sla: number;
}

export function computeOperationalKpis(
  warehouseJobs: WarehouseJob[],
  trips: Trip[],
  containers: ContainerJob[],
  period: ReportPeriod,
): OperationalKpis {
  const whP = warehouseJobs.filter((j) => withinPeriod(j.createdAt, period));
  const tripsP = trips.filter((t) => withinPeriod(t.createdAt, period));
  const contP = containers.filter((c) => withinPeriod(c.createdAt, period));

  const steps = whP.flatMap((j) => j.checklist);
  const whUtil = steps.length
    ? Math.round((steps.filter((s) => s.done).length / steps.length) * 100)
    : 0;
  const fleetUtil = tripsP.length
    ? Math.round((tripsP.filter((t) => t.status !== "Scheduled").length / tripsP.length) * 100)
    : 0;
  const avgDwell = contP.length ? contP.reduce((s, c) => s + c.dwellDays, 0) / contP.length : 0;
  const delivered = tripsP.filter((t) => t.status === "Delivered");
  const sla = delivered.length
    ? Math.round((delivered.filter((t) => t.podUploaded).length / delivered.length) * 100)
    : 100;
  return { whUtil, fleetUtil, avgDwell, sla };
}
