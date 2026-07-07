import { EDGE_LIVE, invokeEdge } from "@/lib/edge";

/**
 * FleetTracker seam — transport/telematics. The real impl calls the fleet-position
 * edge function (maps/GPS provider key server-side); the mock returns a stable,
 * deterministic position so transport views render without a provider.
 */
export interface FleetPosition {
  tripRef: string;
  lat: number;
  lng: number;
  progressPct: number;
  updatedAt: string;
}

export interface FleetTracker {
  position(tripRef: string): Promise<FleetPosition | null>;
}

/** Stable 0..1 hash for deterministic mock coordinates. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

const mockTracker: FleetTracker = {
  async position(tripRef) {
    if (!tripRef) return null;
    const t = hash01(tripRef);
    // Interpolate along a Durban → Johannesburg corridor for a believable demo.
    return {
      tripRef,
      lat: -29.85 + (-26.2 - -29.85) * t,
      lng: 31.02 + (28.04 - 31.02) * t,
      progressPct: Math.round(t * 100),
      updatedAt: new Date().toISOString(),
    };
  },
};

const edgeTracker: FleetTracker = {
  async position(tripRef) {
    return invokeEdge<FleetPosition | null>("fleet-position", { tripRef });
  },
};

export const fleetTracker: FleetTracker = EDGE_LIVE ? edgeTracker : mockTracker;
