/**
 * FleetTracker seam (Phase 2+ — transport/telematics). Stubbed for Phase 1 so
 * the transport views can bind to a stable port without a real telematics SDK.
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

// TODO Phase 2: real telematics provider behind this same port.
export const fleetTracker: FleetTracker = {
  async position() {
    return null;
  },
};
