import { describe, expect, it } from "vitest";
import {
  dbRole,
  docStatus,
  govStatus,
  quoteStatus,
  regStatus,
  reqStatus,
  txStatus,
  uiRole,
  userStatus,
} from "./statusMappers";

describe("statusMappers", () => {
  it("maps shipment status to UI transaction status", () => {
    expect(txStatus("draft")).toBe("Open");
    expect(txStatus("in_progress")).toBe("In Progress");
    expect(txStatus("completed")).toBe("Closed");
  });

  it("maps quote status", () => {
    expect(quoteStatus("selected")).toBe("Accepted");
    expect(quoteStatus("submitted")).toBe("Quoted");
  });

  it("maps registration approval status", () => {
    expect(regStatus("under_review")).toBe("Under Review");
    expect(regStatus("approved")).toBe("Approved");
  });

  it("maps governance and user status", () => {
    expect(govStatus("verified")).toBe("Verified");
    expect(userStatus("suspended")).toBe("Suspended");
  });

  it("maps UI ↔ DB roles", () => {
    expect(uiRole("source_user")).toBe("Source");
    expect(dbRole("Admin")).toBe("operations_admin");
  });

  it("maps document status", () => {
    expect(docStatus("submitted")).toBe("Submitted");
    expect(docStatus("draft")).toBe("Draft");
  });

  it("maps request status", () => {
    expect(reqStatus("quoted")).toBe("Quoted");
  });
});
