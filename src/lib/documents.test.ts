import { describe, expect, it } from "vitest";
import {
  DOC_DB_TO_LABEL,
  DOC_TEMPLATES,
  PHASE1_TEMPLATES,
  PHASE2_TEMPLATES,
  dbFromLabel,
  labelFromDb,
  type DbDocType,
} from "./documents";

describe("document type reconciliation", () => {
  it("round-trips every DB enum value losslessly (db → label → db)", () => {
    for (const db of Object.keys(DOC_DB_TO_LABEL) as DbDocType[]) {
      expect(dbFromLabel(labelFromDb(db))).toBe(db);
    }
  });

  it("maps every template label back to a unique DB value", () => {
    const dbs = DOC_TEMPLATES.map((t) => dbFromLabel(t.label));
    expect(new Set(dbs).size).toBe(DOC_TEMPLATES.length);
  });

  it("partitions templates into 13 Phase-1 and 7 Phase-2", () => {
    expect(PHASE1_TEMPLATES).toHaveLength(13);
    expect(PHASE2_TEMPLATES).toHaveLength(7);
    expect(DOC_TEMPLATES).toHaveLength(20);
  });

  it("falls back safely for an unknown DB value", () => {
    expect(labelFromDb("not_a_real_type")).toBe("Transaction Summary");
  });
});
