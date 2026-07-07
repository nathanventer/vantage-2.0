import { describe, expect, it } from "vitest";
import {
  DEMO_REF_END,
  DEMO_REF_START,
  DEMO_SHIPMENT_COUNT,
  buildDemoDataset,
  countActiveTransactions,
} from "./demoDataset";

describe("demoDataset", () => {
  const demo = buildDemoDataset();

  it("generates 125 shipments TXN-1001..1125", () => {
    expect(demo.transactions).toHaveLength(DEMO_SHIPMENT_COUNT);
    expect(demo.transactions[0].reference).toBe("TXN-1001");
    expect(demo.transactions.at(-1)?.reference).toBe("TXN-1125");
  });

  it("keeps more than 100 active (non-closed) shipments for dashboard KPIs", () => {
    expect(countActiveTransactions(demo.transactions)).toBeGreaterThan(100);
  });

  it("anchors workbook rows TXN-1001..1005", () => {
    const refs = demo.transactions.slice(0, 5).map((t) => t.reference);
    expect(refs).toEqual(["TXN-1001", "TXN-1002", "TXN-1003", "TXN-1004", "TXN-1005"]);
    expect(demo.transactions[0].demandCompany).toBe("Ubuntu Retail Imports (Pty) Ltd");
    expect(demo.transactions[2].status).toBe("Closed");
  });

  it("covers all 11 DB shipment statuses in the bulk set", () => {
    const bulk = demo.transactions.slice(5, 16);
    const uiStatuses = new Set(bulk.map((t) => t.status));
    expect(uiStatuses.size).toBeGreaterThanOrEqual(2);
    expect(demo.transactions.filter((t) => t.status !== "Closed").length).toBeGreaterThan(100);
  });

  it("spreads shipments across calendar months", () => {
    const months = new Set(demo.transactions.map((t) => new Date(t.createdAt).getMonth()));
    expect(months.size).toBeGreaterThanOrEqual(10);
  });

  it("scales related demo modules", () => {
    expect(demo.documents.length).toBeGreaterThan(500);
    expect(demo.invoices.length).toBeGreaterThan(80);
    expect(demo.shipmentRequests.length).toBeGreaterThanOrEqual(90);
    expect(demo.laneRates.length).toBeGreaterThan(400);
  });

  it("derives dashboard series from transactions", () => {
    const withSpend = demo.monthlySpend.filter((m) => m.shipments > 0);
    expect(withSpend.length).toBeGreaterThan(0);
    expect(demo.routeCosts.length).toBeGreaterThan(0);
  });
});
