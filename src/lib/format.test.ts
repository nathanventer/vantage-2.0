import { describe, expect, it } from "vitest";
import { formatZAR } from "./format";

describe("formatZAR", () => {
  it("formats ZAR with no decimals by default", () => {
    expect(formatZAR(1234567)).toMatch(/R\s*1[\s\u00a0]?234[\s\u00a0]?567/);
  });

  it("handles null/undefined as zero", () => {
    expect(formatZAR(null)).toMatch(/R\s*0/);
    expect(formatZAR(undefined)).toMatch(/R\s*0/);
  });

  it("respects decimal places when requested", () => {
    expect(formatZAR(99.5, 2)).toMatch(/99,50|99\.50/);
  });
});
