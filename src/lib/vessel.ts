/**
 * VesselFinder link resolution (FIX 8). We never scrape or call any
 * VesselFinder API — we only build a public deep link from the data we already
 * hold. Resolution order: explicit URL → IMO → MMSI → none (hide the link).
 */

export interface VesselInfo {
  name?: string | null;
  imo?: string | null;
  mmsi?: string | null;
  vesselfinderUrl?: string | null;
}

/** Returns a VesselFinder URL, or null when there is nothing to link to. */
export function vesselFinderUrl(v: VesselInfo): string | null {
  const url = v.vesselfinderUrl?.trim();
  if (url) return url;
  const imo = v.imo?.trim();
  if (imo) return `https://www.vesselfinder.com/vessels/details/${encodeURIComponent(imo)}`;
  const mmsi = v.mmsi?.trim();
  if (mmsi) return `https://www.vesselfinder.com/?mmsi=${encodeURIComponent(mmsi)}`;
  return null;
}

/** True when there is any vessel data worth showing. */
export function hasVesselData(v: VesselInfo): boolean {
  return Boolean(v.name?.trim() || v.imo?.trim() || v.mmsi?.trim() || v.vesselfinderUrl?.trim());
}
