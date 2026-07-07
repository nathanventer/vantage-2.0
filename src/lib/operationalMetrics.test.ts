import { describe, expect, it } from "vitest";
import {
  assessedGoodPct,
  computeOperationalKpis,
  computeProductivityIndex,
  stepCompletionPct,
} from "./operationalMetrics";
import type { CargoHandling, ContainerJob, Trip, WarehouseJob } from "@/types";

const cargo = (over: Partial<CargoHandling> & Pick<CargoHandling, "operation">): CargoHandling => ({
  id: "1",
  reference: "CG-1",
  weightKg: 1000,
  condition: "Good",
  timestamp: new Date().toISOString(),
  ...over,
});

const whJob = (steps: { step: string; done: boolean }[]): WarehouseJob => ({
  id: "1",
  reference: "WH-1",
  warehouseType: "General",
  clientId: "c1",
  client: "Client",
  location: "Durban",
  status: "In Progress",
  checklist: steps,
  createdAt: new Date().toISOString(),
});

describe("operationalMetrics", () => {
  it("assessedGoodPct excludes pending inspection from denominator", () => {
    const records = [
      cargo({ operation: "Offloading", condition: "Good" }),
      cargo({ operation: "Offloading", condition: "Good" }),
      cargo({ operation: "Offloading", condition: "Damaged" }),
      cargo({ operation: "Offloading", condition: "Pending Inspection" }),
    ];
    expect(assessedGoodPct(records)).toBe(67);
  });

  it("stepCompletionPct supports live and mock checklist step names", () => {
    const jobs = [
      whJob([
        { step: "Receive & tally", done: true },
        { step: "Quality inspection", done: false },
      ]),
      whJob([
        { step: "Cargo received", done: true },
        { step: "Destuffing", done: true },
      ]),
    ];
    expect(stepCompletionPct(jobs, ["Receive & tally", "Cargo received"])).toBe(100);
    expect(stepCompletionPct(jobs, ["Quality inspection", "Destuffing"])).toBe(50);
  });

  it("computeProductivityIndex blends cargo, warehouse, and container signals", () => {
    const cargoRows: CargoHandling[] = [
      cargo({ operation: "Bulk Handling", condition: "Good" }),
      cargo({ operation: "Offloading", condition: "Good" }),
      cargo({ operation: "Offloading", condition: "Damaged" }),
      cargo({ operation: "Palletising", condition: "Good" }),
      cargo({ operation: "Loading", condition: "Good" }),
      cargo({ operation: "Weighbridge", condition: "Good" }),
    ];
    const warehouseJobs: WarehouseJob[] = [
      whJob([
        { step: "Receive & tally", done: true },
        { step: "Quality inspection", done: true },
        { step: "Put-away / stage", done: true },
        { step: "Release for delivery", done: false },
      ]),
    ];
    const containers: ContainerJob[] = [
      {
        id: "c1",
        containerNo: "MSCU1",
        type: "Receiving",
        dwellDays: 3,
        damage: false,
        status: "Completed",
        createdAt: new Date().toISOString(),
      },
      {
        id: "c2",
        containerNo: "MSCU2",
        type: "Destuffing",
        dwellDays: 4,
        damage: true,
        status: "In Progress",
        createdAt: new Date().toISOString(),
      },
    ];
    const result = computeProductivityIndex(cargoRows, warehouseJobs, containers, "90");
    const receiving = result.find((r) => r.area === "Receiving");
    const destuffing = result.find((r) => r.area === "Destuffing");
    const dispatch = result.find((r) => r.area === "Dispatch");
    expect(receiving?.v).toBeGreaterThan(90);
    expect(destuffing?.v).toBeGreaterThanOrEqual(50);
    expect(dispatch?.v).toBeLessThan(receiving?.v ?? 100);
  });

  it("computeOperationalKpis respects period filtering on trips", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 10);
    const older = new Date();
    older.setDate(older.getDate() - 60);
    const trips: Trip[] = [
      {
        id: "1",
        reference: "TR-1",
        vehicle: "ZN",
        driver: "A",
        origin: "A",
        destination: "B",
        status: "Scheduled",
        progressPct: 0,
        podUploaded: false,
        lat: 0,
        lng: 0,
        createdAt: older.toISOString(),
      },
      {
        id: "2",
        reference: "TR-2",
        vehicle: "ZN",
        driver: "B",
        origin: "A",
        destination: "B",
        status: "In Transit",
        progressPct: 50,
        podUploaded: false,
        lat: 0,
        lng: 0,
        createdAt: recent.toISOString(),
      },
    ];
    const kpis90 = computeOperationalKpis([], trips, [], "90");
    const kpis30 = computeOperationalKpis([], trips, [], "30");
    expect(kpis90.fleetUtil).toBe(50);
    expect(kpis30.fleetUtil).toBe(100);
  });
});
