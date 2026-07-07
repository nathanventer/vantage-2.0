import { describe, expect, it } from "vitest";
import { computeDashboardMetrics, latestMonthWithData } from "./demoKpis";
import type { Transaction } from "@/types";

function tx(over: Partial<Transaction> & { createdAt: string }): Transaction {
  return {
    id: "t1",
    reference: "TXN-1001",
    demandCompanyId: "c1",
    demandCompany: "Demand",
    sourceProviderId: "p1",
    sourceProvider: "Provider",
    origin: "Durban",
    destination: "Johannesburg",
    cargo: "Steel",
    valueZAR: 1_000_000,
    status: "In Progress",
    currentStage: "Transport",
    steps: [],
    quotes: [
      {
        id: "q1",
        providerId: "p1",
        providerName: "P",
        priceZAR: 100_000,
        etaDays: 5,
        status: "Accepted",
      },
    ],
    ...over,
  };
}

describe("demoKpis", () => {
  it("uses latest month with data for spend summary", () => {
    const series = [
      { month: "Jan", spendZAR: 0, shipments: 0 },
      { month: "Feb", spendZAR: 50_000, shipments: 2 },
      { month: "Mar", spendZAR: 0, shipments: 0 },
    ];
    expect(latestMonthWithData(series)?.month).toBe("Feb");
  });

  it("computes spend this month from series", () => {
    const jan = new Date(2026, 0, 15).toISOString();
    const feb = new Date(2026, 1, 15).toISOString();
    const m = computeDashboardMetrics({
      transactions: [tx({ createdAt: jan }), tx({ createdAt: feb, reference: "TXN-1002" })],
      invoices: [],
      trips: [
        {
          id: "1",
          reference: "TR-1",
          vehicle: "ZN",
          driver: "A",
          origin: "A",
          destination: "B",
          status: "In Transit",
          progressPct: 50,
          podUploaded: false,
          lat: 0,
          lng: 0,
        },
      ],
      registrations: [],
      complianceFlags: [],
      auditEvents: [],
      shipmentRequests: [],
    });
    expect(m.spendThisMonthZAR).toBeGreaterThan(0);
    expect(m.fleetUtilisationPct).toBe(100);
  });
});
