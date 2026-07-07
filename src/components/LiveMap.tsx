import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Trip } from "@/types";
import {
  BORDER_POSTS,
  MAJOR_CITIES,
  PORTS,
  WAREHOUSE_HUBS,
  deriveOps,
  hash01,
  resolvePlace,
} from "@/lib/tracking";

/**
 * LiveMap — the Vantage control-tower map. Real digital basemap (CARTO dark /
 * Esri satellite, both keyless) over true South African geography with:
 * status-coloured glowing routes, pulsing live vehicles, ports, border posts,
 * warehouse hubs and city labels. Clicking any vehicle selects its trip.
 * Client-side only (dynamic import) so SSR stays clean.
 */

/** Sample a gently-curved corridor between two points (quadratic bezier). */
function corridor(
  a: [number, number],
  b: [number, number],
  seed: string,
  n = 64,
): [number, number][] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const dist = Math.hypot(dx, dy) || 1e-6;
  const side = hash01(seed) > 0.5 ? 1 : -1;
  const bow = Math.min(0.35, dist * 0.16) * side;
  const ctrl: [number, number] = [mid[0] + (dx / dist) * bow, mid[1] - (dy / dist) * bow];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0],
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1],
    ]);
  }
  return pts;
}

/** Route geometry for a trip: full path + index of the live position. */
export function tripRoute(trip: Trip): { path: [number, number][]; cut: number } {
  const origin = resolvePlace(trip.origin, trip.reference);
  let dest = resolvePlace(trip.destination, trip.reference + "d");
  // Same-city trips (e.g. "Witbank → Witbank DC"): the depot sits on the city
  // outskirts, so nudge the destination for a real, visible leg.
  if (Math.hypot(dest[0] - origin[0], dest[1] - origin[1]) < 0.05) {
    const ang = hash01(trip.reference + "ang") * Math.PI * 2;
    dest = [origin[0] + Math.sin(ang) * 0.35, origin[1] + Math.cos(ang) * 0.35];
  }
  const path = corridor(origin, dest, trip.reference);
  const cut =
    trip.status === "Delivered"
      ? path.length - 1
      : trip.status === "Scheduled"
        ? 0
        : Math.max(
            1,
            Math.min(path.length - 2, Math.round((trip.progressPct / 100) * path.length)),
          );
  return { path, cut };
}

// Inline SVG marker glyphs (lucide outlines) — elegant icons, no image assets.
const GLYPHS = {
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35a1 1 0 0 0-.78-.38H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  ship: '<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  plane:
    '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  train:
    '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
  warehouse:
    '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
  anchor:
    '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>',
  border:
    '<path d="M4 22V4c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v18"/><path d="M2 22h20"/><path d="M12 3v19"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>',
} as const;

function glyphIconHtml(kind: keyof typeof GLYPHS, color: string, ring = false): string {
  return `<div class="map-glyph${ring ? " map-glyph-live" : ""}" style="--glyph:${color}">
    ${ring ? '<span class="map-live-ping" style="background:var(--glyph)"></span>' : ""}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[kind]}</svg>
  </div>`;
}

const MODE_GLYPH: Record<string, keyof typeof GLYPHS> = {
  "Road Freight": "truck",
  "Sea Freight": "ship",
  "Air Freight": "plane",
  Rail: "train",
  "Warehouse Transfer": "box",
};

export function LiveMap({
  trips,
  selected,
  onSelect,
}: {
  trips: Trip[];
  selected: Trip;
  onSelect: (tripId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [satellite, setSatellite] = useState(false);
  const ops = deriveOps(selected);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      // Basemap: Apple-dark digital (CARTO) or satellite (Esri) — keyless.
      if (satellite) {
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: "&copy; Esri, Maxar, Earthstar Geographics", maxZoom: 18 },
        ).addTo(map);
      } else {
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);
      }
      L.control.zoom({ position: "topright" }).addTo(map);

      // ── Static logistics layers ─────────────────────────────────────────
      for (const c of MAJOR_CITIES) {
        L.circleMarker(c.coords, {
          radius: 2.5,
          color: "#8494ad",
          weight: 1,
          fillColor: "#8494ad",
          fillOpacity: 0.9,
        }).addTo(map);
        L.marker(c.coords, {
          icon: L.divIcon({
            className: "",
            html: `<div class="map-city">${c.name}</div>`,
            iconAnchor: [-5, 8],
          }),
          interactive: false,
        }).addTo(map);
      }
      for (const p of PORTS) {
        L.marker(p.coords, {
          icon: L.divIcon({
            className: "",
            html: glyphIconHtml("anchor", "#38bdf8"),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        })
          .addTo(map)
          .bindTooltip(p.name, { direction: "top", className: "map-tip" });
      }
      for (const b of BORDER_POSTS) {
        L.marker(b.coords, {
          icon: L.divIcon({
            className: "",
            html: glyphIconHtml("border", "#fbbf24"),
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
          .addTo(map)
          .bindTooltip(`Border post — ${b.name}`, { direction: "top", className: "map-tip" });
      }
      for (const w of WAREHOUSE_HUBS) {
        L.marker(w.coords, {
          icon: L.divIcon({
            className: "",
            html: glyphIconHtml("warehouse", "#a6b2c8"),
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
          .addTo(map)
          .bindTooltip(`Warehouse hub — ${w.name}`, { direction: "top", className: "map-tip" });
      }

      // ── Other active shipments: thin routes + clickable vehicle markers ──
      for (const t of trips) {
        if (t.id === selected.id) continue;
        const o = deriveOps(t);
        const { path, cut } = tripRoute(t);
        if (t.status === "In Transit") {
          L.polyline(path.slice(0, cut + 1), { color: o.color, weight: 1.5, opacity: 0.35 }).addTo(
            map,
          );
        }
        const pos = path[cut];
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: "",
            html: glyphIconHtml(MODE_GLYPH[o.mode] ?? "truck", o.color),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }).addTo(map);
        marker.bindTooltip(
          `<b>${t.reference}</b> · ${o.status}<br/>${t.origin} → ${t.destination}`,
          { direction: "top", className: "map-tip" },
        );
        marker.on("click", () => onSelect(t.id));
      }

      // ── Selected shipment: glowing route + pulsing live marker ──────────
      const { path, cut } = tripRoute(selected);
      const travelled = path.slice(0, cut + 1);
      const remaining = path.slice(cut);
      if (remaining.length > 1 && selected.status !== "Delivered") {
        L.polyline(remaining, {
          color: "#8494ad",
          weight: 2,
          opacity: 0.7,
          dashArray: "4 8",
        }).addTo(map);
      }
      if (travelled.length > 1) {
        L.polyline(travelled, { color: ops.color, weight: 10, opacity: 0.2 }).addTo(map);
        L.polyline(travelled, { color: ops.color, weight: 3.5, opacity: 0.95 }).addTo(map);
      }
      const chip = (text: string) =>
        L.divIcon({
          className: "",
          html: `<div class="map-chip">${text}</div>`,
          iconAnchor: [-8, 12],
        });
      L.circleMarker(path[0], {
        radius: 5,
        color: ops.color,
        weight: 2,
        fillColor: "#0f1626",
        fillOpacity: 1,
      }).addTo(map);
      L.marker(path[0], { icon: chip(selected.origin), interactive: false }).addTo(map);
      L.circleMarker(path[path.length - 1], {
        radius: 5,
        color: selected.status === "Delivered" ? ops.color : "#8494ad",
        weight: 2,
        fillColor: "#0f1626",
        fillOpacity: 1,
      }).addTo(map);
      L.marker(path[path.length - 1], {
        icon: chip(selected.destination),
        interactive: false,
      }).addTo(map);
      if (selected.status !== "Scheduled") {
        L.marker(path[cut], {
          icon: L.divIcon({
            className: "",
            html: glyphIconHtml(MODE_GLYPH[ops.mode] ?? "truck", ops.color, true),
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(map);
      }

      // Frame the route generously and never zoom past the "regional" level —
      // the control tower should always show recognisable SA geography.
      map.fitBounds(L.latLngBounds([path[0], path[path.length - 1]]).pad(0.55), { maxZoom: 8 });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.id, trips.length, satellite]);

  function toggleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }

  return (
    <div
      ref={wrapperRef}
      className="vantage-map relative overflow-hidden rounded-xl border bg-inset"
    >
      <div
        ref={containerRef}
        className="h-[400px] w-full lg:h-[440px]"
        aria-label={`Live route map for ${selected.reference}`}
      />

      {/* Header chips */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1100] flex max-w-[70%] flex-wrap items-center gap-2">
        <div className="rounded-lg border bg-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
          <span className="text-muted-foreground">From</span>{" "}
          <span className="font-medium">{selected.origin}</span>
          <span className="mx-1.5 text-muted-foreground">→</span>
          <span className="text-muted-foreground">To</span>{" "}
          <span className="font-medium">{selected.destination}</span>
        </div>
        <div
          className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur"
          style={{
            background: "rgba(15,22,38,0.9)",
            color: ops.color,
            borderColor: `${ops.color}44`,
          }}
        >
          {ops.status}
          {ops.etaHours != null ? ` · ETA ${ops.etaHours}h` : ""}
        </div>
      </div>

      {/* Map controls (bottom-right, above attribution) */}
      <div className="absolute bottom-8 right-3 z-[1100] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setSatellite((s) => !s)}
          className="rounded-lg border bg-surface/90 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
        >
          {satellite ? "Digital" : "Satellite"}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg border bg-surface/90 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
        >
          Fullscreen
        </button>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-8 left-3 z-[1100] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-surface/90 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#2f6bff" }} />{" "}
          On-time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#fb923c" }} />{" "}
          Delayed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#a78bfa" }} />{" "}
          Customs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#34d399" }} />{" "}
          Delivered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#f87171" }} />{" "}
          Risk
        </span>
      </div>
    </div>
  );
}
