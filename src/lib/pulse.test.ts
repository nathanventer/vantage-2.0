import { describe, expect, it } from "vitest";
import { buildRateBenchmarks, laneLabel } from "./pulse";
import type { LaneRate } from "@/types";

function rate(over: Partial<LaneRate>): LaneRate {
  return {
    id: Math.random().toString(36).slice(2),
    origin: "Durban",
    destination: "Johannesburg",
    mode: "Road",
    period: "2026-01",
    providerName: "Acme",
    priceZAR: 100_000,
    transitDays: 4,
    ...over,
  };
}

describe("pulse benchmarks", () => {
  it("formats a lane label", () => {
    expect(laneLabel("Durban", "Johannesburg")).toBe("Durban → Johannesburg");
  });

  it("computes median / low / high / samples per lane+mode", () => {
    const b = buildRateBenchmarks([
      rate({ priceZAR: 100_000, period: "2026-01" }),
      rate({ priceZAR: 120_000, period: "2026-01" }),
      rate({ priceZAR: 140_000, period: "2026-01" }),
    ]);
    expect(b).toHaveLength(1);
    expect(b[0].medianZAR).toBe(120_000);
    expect(b[0].lowZAR).toBe(100_000);
    expect(b[0].highZAR).toBe(140_000);
    expect(b[0].samples).toBe(3);
  });

  it("computes month-over-month median change from the last two periods", () => {
    const b = buildRateBenchmarks([
      rate({ priceZAR: 100_000, period: "2026-01" }),
      rate({ priceZAR: 110_000, period: "2026-02" }),
    ]);
    expect(b[0].momChangePct).toBeCloseTo(10, 5);
  });

  it("separates distinct modes on the same lane", () => {
    const b = buildRateBenchmarks([rate({ mode: "Road" }), rate({ mode: "Sea" })]);
    expect(b).toHaveLength(2);
  });
});
