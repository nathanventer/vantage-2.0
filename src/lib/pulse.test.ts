import { describe, expect, it } from "vitest";
import {
  alertPresets,
  buildLaneSuppliers,
  buildLaneTrend,
  buildRateBenchmarks,
  formatPeriodLabel,
  laneLabel,
  pulseYDomain,
} from "./pulse";
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

const lane = {
  lane: "Durban → Johannesburg",
  origin: "Durban",
  destination: "Johannesburg",
  mode: "Road" as const,
};

describe("pulse benchmarks", () => {
  it("formats a lane label", () => {
    expect(laneLabel("Durban", "Johannesburg")).toBe("Durban → Johannesburg");
  });

  it("formats period labels", () => {
    expect(formatPeriodLabel("2026-01")).toMatch(/Jan/i);
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

  it("builds monthly median trend with low/high band", () => {
    const trend = buildLaneTrend(
      [
        rate({ priceZAR: 100_000, period: "2026-01" }),
        rate({ priceZAR: 120_000, period: "2026-01" }),
        rate({ priceZAR: 110_000, period: "2026-02" }),
      ],
      lane,
    );
    expect(trend).toHaveLength(2);
    expect(trend[0].median).toBe(110_000);
    expect(trend[0].low).toBe(100_000);
    expect(trend[0].high).toBe(120_000);
    expect(trend[1].median).toBe(110_000);
  });

  it("aggregates latest-period supplier quotes sorted by price", () => {
    const snap = buildLaneSuppliers(
      [
        rate({ providerName: "B", priceZAR: 120_000, period: "2026-01" }),
        rate({ providerName: "A", priceZAR: 100_000, period: "2026-01" }),
        rate({ providerName: "C", priceZAR: 999_000, period: "2025-12" }),
      ],
      lane,
    );
    expect(snap.period).toBe("2026-01");
    expect(snap.rows.map((s) => s.provider)).toEqual(["A", "B"]);
    expect(snap.laneMedian).toBe(110_000);
  });

  it("pads y-axis domain from data", () => {
    const [min, max] = pulseYDomain([100_000, 120_000]);
    expect(min).toBeLessThan(100_000);
    expect(max).toBeGreaterThan(120_000);
  });

  it("builds alert presets from benchmark stats", () => {
    const b = buildRateBenchmarks([
      rate({ priceZAR: 100_000 }),
      rate({ priceZAR: 200_000 }),
    ])[0]!;
    const presets = alertPresets(b);
    expect(presets).toHaveLength(4);
    expect(presets.some((p) => p.direction === "below" && p.id === "below-median")).toBe(true);
  });
});
