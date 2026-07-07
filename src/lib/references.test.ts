import { describe, expect, it } from "vitest";
import { formatReference, isValidReference, parseReference, txnRefNumber } from "./references";

describe("references", () => {
  it("parses valid VTG references", () => {
    expect(parseReference("VTG-TXN-1003")).toEqual({ prefix: "TXN", number: 1003 });
    expect(parseReference("VTG-INV-42")).toEqual({ prefix: "INV", number: 42 });
  });

  it("rejects invalid references", () => {
    expect(parseReference("TXN-1003")).toBeNull();
    expect(parseReference("VTG-FOO-1")).toBeNull();
    expect(isValidReference("VTG-QTE-9001")).toBe(true);
    expect(isValidReference("bad")).toBe(false);
  });

  it("formats references consistently", () => {
    expect(formatReference("PO", 1005)).toBe("VTG-PO-1005");
  });

  it("parses TXN numbers for sorting", () => {
    expect(txnRefNumber("TXN-1060")).toBe(1060);
    expect(txnRefNumber("VTG-TXN-1003")).toBe(1003);
    expect(txnRefNumber("INV-42")).toBeNull();
  });
});
