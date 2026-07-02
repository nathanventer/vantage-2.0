import type { Trip } from "@/types";

/**
 * Tracking derivations — deterministic per-trip operational signals (display
 * status, transport mode, province, ETA) so the control tower renders a rich,
 * stable picture without a telematics provider. Every derivation hashes the
 * trip reference, so values never change between renders or sessions.
 * Replaced by real feeds via the FleetTracker seam in Phase 2.
 */

export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function hashN(s: string, mod: number, offset = 0): number {
  return offset + Math.floor(hash01(s) * mod);
}

/** Southern Africa gazetteer — resolves place names to real coordinates. */
export const SA_CITIES: Record<string, [number, number]> = {
  johannesburg: [-26.2041, 28.0473],
  pretoria: [-25.7479, 28.2293],
  durban: [-29.8587, 31.0218],
  "cape town": [-33.9249, 18.4241],
  gqeberha: [-33.9608, 25.6022],
  "port elizabeth": [-33.9608, 25.6022],
  "east london": [-33.0292, 27.8546],
  bloemfontein: [-29.0852, 26.1596],
  polokwane: [-23.9045, 29.4689],
  nelspruit: [-25.4753, 30.9694],
  mbombela: [-25.4753, 30.9694],
  witbank: [-25.872, 29.2553],
  emalahleni: [-25.872, 29.2553],
  kimberley: [-28.7383, 24.7639],
  rustenburg: [-25.6545, 27.2559],
  pietermaritzburg: [-29.6006, 30.3794],
  harrismith: [-28.2716, 29.1298],
  villiers: [-27.0294, 28.6],
  "richards bay": [-28.783, 32.0377],
  george: [-33.9648, 22.459],
  upington: [-28.4478, 21.2561],
  musina: [-22.3527, 30.041],
  maputo: [-25.9692, 32.5732],
  gaborone: [-24.6282, 25.9231],
  windhoek: [-22.5609, 17.0658],
  "walvis bay": [-22.9576, 14.5053],
  harare: [-17.8252, 31.0335],
  lusaka: [-15.3875, 28.3228],
};

/** Major-city labels always visible on the map. */
export const MAJOR_CITIES: { name: string; coords: [number, number] }[] = [
  { name: "Johannesburg", coords: SA_CITIES.johannesburg },
  { name: "Pretoria", coords: SA_CITIES.pretoria },
  { name: "Durban", coords: SA_CITIES.durban },
  { name: "Cape Town", coords: SA_CITIES["cape town"] },
  { name: "Gqeberha", coords: SA_CITIES.gqeberha },
  { name: "East London", coords: SA_CITIES["east london"] },
  { name: "Bloemfontein", coords: SA_CITIES.bloemfontein },
  { name: "Kimberley", coords: SA_CITIES.kimberley },
  { name: "Mbombela", coords: SA_CITIES.nelspruit },
  { name: "Polokwane", coords: SA_CITIES.polokwane },
  { name: "Richards Bay", coords: SA_CITIES["richards bay"] },
];

export const PORTS: { name: string; coords: [number, number] }[] = [
  { name: "Port of Durban", coords: [-29.87, 31.03] },
  { name: "Port of Cape Town", coords: [-33.906, 18.437] },
  { name: "Port of Richards Bay", coords: [-28.8, 32.05] },
  { name: "Port of Gqeberha", coords: [-33.965, 25.63] },
];

export const BORDER_POSTS: { name: string; coords: [number, number] }[] = [
  { name: "Beitbridge (ZW)", coords: [-22.216, 29.983] },
  { name: "Skilpadshek (BW)", coords: [-25.263, 25.703] },
  { name: "Vioolsdrif (NA)", coords: [-28.76, 17.63] },
  { name: "Lebombo (MZ)", coords: [-25.44, 31.98] },
];

export const WAREHOUSE_HUBS: { name: string; coords: [number, number] }[] = [
  { name: "City Deep Terminal, JHB", coords: [-26.23, 28.09] },
  { name: "Bayhead Warehousing, DBN", coords: [-29.89, 31.0] },
  { name: "Montague Gardens, CPT", coords: [-33.87, 18.52] },
];

const PROVINCE_BY_CITY: Record<string, string> = {
  johannesburg: "Gauteng",
  pretoria: "Gauteng",
  witbank: "Mpumalanga",
  emalahleni: "Mpumalanga",
  nelspruit: "Mpumalanga",
  mbombela: "Mpumalanga",
  durban: "KwaZulu-Natal",
  pietermaritzburg: "KwaZulu-Natal",
  "richards bay": "KwaZulu-Natal",
  "cape town": "Western Cape",
  george: "Western Cape",
  gqeberha: "Eastern Cape",
  "port elizabeth": "Eastern Cape",
  "east london": "Eastern Cape",
  bloemfontein: "Free State",
  harrismith: "Free State",
  villiers: "Free State",
  kimberley: "Northern Cape",
  upington: "Northern Cape",
  polokwane: "Limpopo",
  musina: "Limpopo",
  rustenburg: "North West",
};

export function resolvePlace(name: string, seed: string): [number, number] {
  const key = name
    .toLowerCase()
    .replace(/\b(dc|port|depot|terminal|warehouse|hub)\b/g, "")
    .replace(/[^a-z ]/g, "")
    .trim();
  for (const [city, coords] of Object.entries(SA_CITIES)) {
    if (key.includes(city)) return coords;
  }
  const t = hash01(seed + name);
  return [-26.2041 + (t - 0.5) * 3.2, 28.0473 + (hash01(name + seed) - 0.5) * 3.2];
}

export function provinceOf(place: string): string {
  const key = place.toLowerCase();
  for (const [city, prov] of Object.entries(PROVINCE_BY_CITY)) {
    if (key.includes(city)) return prov;
  }
  return "Gauteng";
}

export type OpsStatus =
  | "In Transit"
  | "At Port"
  | "Customs Clearance"
  | "Delayed"
  | "Delivered"
  | "Awaiting Collection"
  | "Scheduled";

export type TransportMode =
  | "Road Freight"
  | "Sea Freight"
  | "Air Freight"
  | "Rail"
  | "Warehouse Transfer";

export interface TripOps {
  status: OpsStatus;
  mode: TransportMode;
  originProvince: string;
  destProvince: string;
  etaHours: number | null;
  /** Route colour keyed to status (blue/orange/purple/green/red). */
  color: string;
  risk: boolean;
}

export const STATUS_COLORS: Record<OpsStatus, string> = {
  "In Transit": "#2f6bff",
  "At Port": "#38bdf8",
  "Customs Clearance": "#a78bfa",
  Delayed: "#fb923c",
  Delivered: "#34d399",
  "Awaiting Collection": "#8494ad",
  Scheduled: "#8494ad",
};

/** Derive the operational picture for a trip (stable per reference). */
export function deriveOps(trip: Trip): TripOps {
  const r = trip.reference;
  let status: OpsStatus;
  if (trip.status === "Delivered") status = "Delivered";
  else if (trip.status === "Scheduled")
    status = hashN(r + "s", 3) === 0 ? "Awaiting Collection" : "Scheduled";
  else {
    const v = hashN(r + "v", 12);
    status = v < 2 ? "Delayed" : v < 4 ? "Customs Clearance" : v < 5 ? "At Port" : "In Transit";
  }

  const isPortish = /port|durban|cape town|richards|gqeberha/i.test(trip.origin + trip.destination);
  const m = hashN(r + "m", 10);
  const mode: TransportMode =
    isPortish && m < 4
      ? "Sea Freight"
      : m === 4
        ? "Air Freight"
        : m === 5
          ? "Rail"
          : m === 6
            ? "Warehouse Transfer"
            : "Road Freight";

  const totalHours = hashN(r + "h", 10, 8);
  const etaHours =
    status === "Delivered"
      ? null
      : trip.status === "Scheduled"
        ? totalHours
        : Math.max(1, Math.round(totalHours * (1 - trip.progressPct / 100)) + (status === "Delayed" ? 4 : 0));

  const risk = status === "Delayed" && hashN(r + "r", 3) === 0;

  return {
    status,
    mode,
    originProvince: provinceOf(trip.origin),
    destProvince: provinceOf(trip.destination),
    etaHours,
    color: risk ? "#f87171" : STATUS_COLORS[status],
    risk,
  };
}

/** Live activity feed derived from the freshest trips (stable ordering). */
export function buildActivityFeed(trips: Trip[]): { id: string; text: string; minsAgo: number }[] {
  const events: { id: string; text: string; minsAgo: number }[] = [];
  for (const t of trips.slice(0, 14)) {
    const ops = deriveOps(t);
    const ref = t.shipmentRef ?? t.reference;
    const text =
      ops.status === "Delivered"
        ? `${ref} delivered in ${t.destination}`
        : ops.status === "Delayed"
          ? `${ref} delayed near ${t.origin} — revised ETA ${ops.etaHours}h`
          : ops.status === "Customs Clearance"
            ? `${ref} under customs inspection`
            : ops.status === "At Port"
              ? `${ref} arrived at ${t.origin}`
              : ops.status === "In Transit"
                ? `${ref} departed ${t.origin} — ${t.driver} checked in`
                : `${ref} collection scheduled in ${t.origin}`;
    events.push({ id: t.id, text, minsAgo: hashN(t.reference + "t", 55, 2) });
  }
  return events.sort((a, b) => a.minsAgo - b.minsAgo).slice(0, 8);
}

/** Journey timeline for the detail panel (derived from status/progress). */
export function buildTimeline(trip: Trip): { label: string; done: boolean; at?: string }[] {
  const ops = deriveOps(trip);
  const p = trip.progressPct;
  const started = trip.status !== "Scheduled";
  const delivered = trip.status === "Delivered";
  const base = trip.createdAt ? new Date(trip.createdAt).getTime() : Date.now() - 86400000;
  const at = (i: number) => new Date(base + i * 3 * 3600000).toISOString();
  return [
    { label: "Booking confirmed", done: true, at: at(0) },
    { label: `Collection scheduled — ${trip.origin}`, done: true, at: at(1) },
    { label: "Cargo collected & documentation verified", done: started, at: started ? at(2) : undefined },
    { label: "Departed origin hub", done: started && p > 10, at: started && p > 10 ? at(3) : undefined },
    {
      label: ops.status === "Customs Clearance" ? "Customs inspection in progress" : "Customs cleared",
      done: started && p > 35,
      at: started && p > 35 ? at(4) : undefined,
    },
    { label: "In transit — main corridor leg", done: started && p > 50, at: started && p > 50 ? at(5) : undefined },
    { label: `Out for delivery — ${trip.destination}`, done: p > 85, at: p > 85 ? at(6) : undefined },
    { label: "Delivered & POD signed", done: delivered, at: delivered ? at(7) : undefined },
  ];
}
