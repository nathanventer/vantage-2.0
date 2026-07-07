import { describe, expect, it } from "vitest";
import { computeInvoice, round2, DEFAULT_TAX_RATE } from "./invoice";

describe("computeInvoice", () => {
  it("matches the FIX 7 worked example (2×1000 + 3×500 @ 15%)", () => {
    const r = computeInvoice([
      { label: "Freight", quantity: 2, unitPriceZAR: 1000 },
      { label: "Handling", quantity: 3, unitPriceZAR: 500 },
    ]);
    expect(r.subtotalZAR).toBe(3500);
    expect(r.taxZAR).toBe(525);
    expect(r.totalZAR).toBe(4025);
    expect(r.hadInvalidInput).toBe(false);
  });

  it("coerces string inputs numerically (no '100'+'50' concatenation)", () => {
    const r = computeInvoice([{ label: "A", quantity: "1", unitPriceZAR: "100" }], 0.15);
    expect(r.subtotalZAR).toBe(100);
    expect(r.taxZAR).toBe(15);
    expect(r.totalZAR).toBe(115);
  });

  it("treats non-finite inputs as 0 and flags them", () => {
    const r = computeInvoice([
      { label: "Bad", quantity: "abc", unitPriceZAR: 100 },
      { label: "Good", quantity: 2, unitPriceZAR: 250 },
    ]);
    expect(r.subtotalZAR).toBe(500);
    expect(r.hadInvalidInput).toBe(true);
    expect(Number.isNaN(r.totalZAR)).toBe(false);
  });

  it("rounds at total level with cent precision", () => {
    const r = computeInvoice([{ label: "X", quantity: 3, unitPriceZAR: 33.33 }], 0.15);
    expect(r.subtotalZAR).toBe(99.99);
    expect(r.taxZAR).toBe(15);
    expect(r.totalZAR).toBe(114.99);
  });

  it("uses the default SA VAT rate when none is passed", () => {
    expect(DEFAULT_TAX_RATE).toBe(0.15);
    const r = computeInvoice([{ label: "X", quantity: 1, unitPriceZAR: 200 }]);
    expect(r.taxZAR).toBe(30);
  });

  it("round2 never returns NaN and rounds to cents", () => {
    expect(round2(Number.NaN)).toBe(0);
    expect(round2(114.994)).toBe(114.99);
    expect(round2(114.995)).toBe(115);
  });
});
