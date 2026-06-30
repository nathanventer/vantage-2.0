import { describe, expect, it } from "vitest";
import { optimizer, OPTIMIZER_WEIGHTS, type QuoteScoreInput } from "./optimizer";

const quotes: QuoteScoreInput[] = [
  { id: "q1", providerId: "p-alpha", providerName: "Alpha", priceZAR: 100_000, etaDays: 10 },
  { id: "q2", providerId: "p-bravo", providerName: "Bravo", priceZAR: 120_000, etaDays: 8 },
  { id: "q3", providerId: "p-charlie", providerName: "Charlie", priceZAR: 90_000, etaDays: 14 },
];

describe("optimizer.score", () => {
  it("returns an empty, safe result for no quotes", () => {
    const r = optimizer.score([]);
    expect(r.ranked).toHaveLength(0);
    expect(r.recommendedQuoteId).toBeNull();
    expect(r.savingsZAR).toBe(0);
  });

  it("ranks deterministically and assigns sequential ranks", () => {
    const a = optimizer.score(quotes);
    const b = optimizer.score(quotes);
    expect(a.ranked.map((q) => q.id)).toEqual(b.ranked.map((q) => q.id));
    expect(a.ranked.map((q) => q.rank)).toEqual([1, 2, 3]);
    expect(a.recommendedQuoteId).toBe(a.ranked[0].id);
  });

  it("keeps each total within the 0..100 weighted envelope", () => {
    const total = Object.values(OPTIMIZER_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBe(100);
    for (const q of optimizer.score(quotes).ranked) {
      expect(q.totalScore).toBeGreaterThan(0);
      expect(q.totalScore).toBeLessThanOrEqual(100);
    }
  });

  it("computes savings as benchmark mean minus recommended price (>= 0)", () => {
    const r = optimizer.score(quotes);
    expect(r.savingsZAR).toBeGreaterThanOrEqual(0);
  });

  it("gives the cheapest quote the full cost weight", () => {
    const r = optimizer.score(quotes);
    const cheapest = r.ranked.find((q) => q.providerId === "p-charlie")!;
    expect(cheapest.costScore).toBeCloseTo(OPTIMIZER_WEIGHTS.cost, 5);
  });
});
