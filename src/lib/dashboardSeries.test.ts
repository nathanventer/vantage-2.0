import { describe, expect, it } from "vitest";
import { buildRouteCostRows, shipmentBenchmark, shipmentCost } from "./dashboardSeries";
import type { Transaction } from "@/types";

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    reference: "VTG-TXN-1",
    demandCompanyId: "c1",
    demandCompany: "Demand Co",
    sourceProviderId: "p1",
    sourceProvider: "Provider",
    origin: "Durban",
    destination: "Johannesburg",
    cargo: "Steel",
    valueZAR: 1_000_000,
    status: "In Progress",
    currentStage: "Transport",
    createdAt: new Date().toISOString(),
    steps: [],
    quotes: [],
    ...over,
  };
}

describe("dashboardSeries cost helpers", () => {
  it("uses the accepted quote for shipment cost, else the first", () => {
    const t = tx({
      quotes: [
        {
          id: "q1",
          providerId: "p1",
          providerName: "A",
          priceZAR: 100,
          etaDays: 5,
          status: "Quoted",
        },
        {
          id: "q2",
          providerId: "p2",
          providerName: "B",
          priceZAR: 80,
          etaDays: 6,
          status: "Accepted",
        },
      ],
    });
    expect(shipmentCost(t)).toBe(80);
    expect(shipmentBenchmark(t)).toBe(90);
  });

  it("rolls up route cost / budget / savings / variance", () => {
    const rows = buildRouteCostRows([
      tx({
        quotes: [
          {
            id: "q1",
            providerId: "p1",
            providerName: "A",
            priceZAR: 100,
            etaDays: 5,
            status: "Accepted",
          },
          {
            id: "q2",
            providerId: "p2",
            providerName: "B",
            priceZAR: 140,
            etaDays: 6,
            status: "Quoted",
          },
        ],
      }),
    ]);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.route).toBe("Durban → Johannesburg");
    expect(r.costZAR).toBe(100);
    expect(r.budgetZAR).toBe(120);
    expect(r.savingsZAR).toBe(20);
    expect(r.variancePct).toBeCloseTo(((100 - 120) / 120) * 100, 5);
  });

  it("ignores shipments with no priced quote", () => {
    expect(buildRouteCostRows([tx({ quotes: [] })])).toHaveLength(0);
  });
});
