import { describe, expect, it } from "vitest";
import { vesselFinderUrl, hasVesselData } from "./vessel";

describe("vesselFinderUrl", () => {
  it("prefers an explicit URL", () => {
    expect(vesselFinderUrl({ vesselfinderUrl: "https://x.test/v", imo: "9319466" })).toBe(
      "https://x.test/v",
    );
  });
  it("falls back to IMO details", () => {
    expect(vesselFinderUrl({ imo: "9319466" })).toBe(
      "https://www.vesselfinder.com/vessels/details/9319466",
    );
  });
  it("falls back to MMSI query", () => {
    expect(vesselFinderUrl({ mmsi: "636019825" })).toBe(
      "https://www.vesselfinder.com/?mmsi=636019825",
    );
  });
  it("returns null with no identifiers", () => {
    expect(vesselFinderUrl({ name: "MSC Sinfonia" })).toBeNull();
    expect(vesselFinderUrl({})).toBeNull();
  });
});

describe("hasVesselData", () => {
  it("is false when everything is empty/whitespace", () => {
    expect(hasVesselData({ name: "  ", imo: "", mmsi: null })).toBe(false);
    expect(hasVesselData({})).toBe(false);
  });
  it("is true with any field", () => {
    expect(hasVesselData({ name: "MSC Sinfonia" })).toBe(true);
  });
});
