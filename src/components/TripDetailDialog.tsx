import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import type { Trip, TripWaypoint } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Truck, User, FileCheck2, Clock } from "lucide-react";

/**
 * Trip detail: schematic GPS route map (waypoint trace + live position),
 * vehicle/driver meta and POD state. The map is an SVG projection of the
 * recorded lat/lng breadcrumbs — no tile provider or API key needed.
 */
export function TripDetailDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: waypoints, isLoading } = useQuery({
    queryKey: ["trip-route", trip?.id],
    queryFn: () => api.listTripWaypoints(trip!.id),
    enabled: open && !!trip,
  });

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Truck className="h-5 w-5 text-brand" /> {trip.reference}
            <StatusBadge status={trip.status} />
          </DialogTitle>
          <DialogDescription>
            {trip.origin} → {trip.destination}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <RouteMap trip={trip} waypoints={waypoints ?? []} />
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta icon={Truck} label="Vehicle" value={trip.vehicle} />
          <Meta icon={User} label="Driver" value={trip.driver} />
          <Meta
            icon={FileCheck2}
            label="Proof of delivery"
            value={trip.podUploaded ? "Uploaded" : "Pending"}
          />
          <Meta
            icon={MapPin}
            label="Last position"
            value={`${trip.lat.toFixed(3)}, ${trip.lng.toFixed(3)}`}
          />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Route progress</span>
            <span className="tabular-nums">{trip.progressPct}%</span>
          </div>
          <Progress value={trip.progressPct} className="h-1.5" />
        </div>

        {(waypoints?.length ?? 0) > 0 && (
          <div className="rounded-lg border bg-inset/40 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Telemetry history
            </div>
            <ol className="space-y-1.5">
              {(waypoints ?? []).map((w) => (
                <li key={w.seq} className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{w.label ?? `Waypoint ${w.seq}`}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(w.recordedAt).toLocaleString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-inset/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </div>
    </div>
  );
}

/** Project lat/lng breadcrumbs into an SVG viewBox and draw the route. */
function RouteMap({ trip, waypoints }: { trip: Trip; waypoints: TripWaypoint[] }) {
  const W = 640;
  const H = 220;
  const PAD = 28;

  // Points: waypoint trace + the live position; fall back to a straight leg.
  const pts: { lat: number; lng: number; label?: string }[] =
    waypoints.length > 0
      ? [...waypoints, { lat: trip.lat, lng: trip.lng, label: "Now" }]
      : [
          { lat: -29.8587, lng: 31.0218, label: trip.origin },
          { lat: trip.lat, lng: trip.lng, label: "Now" },
        ];

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const x = (lng: number) =>
    PAD + ((lng - minLng) / Math.max(1e-6, maxLng - minLng)) * (W - PAD * 2);
  const y = (lat: number) =>
    H - PAD - ((lat - minLat) / Math.max(1e-6, maxLat - minLat)) * (H - PAD * 2);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.lng)},${y(p.lat)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <div className="overflow-hidden rounded-xl border bg-inset/40">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Route map">
        {/* subtle grid */}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(W / 7) * (i + 0.5)}
            y1={0}
            x2={(W / 7) * (i + 0.5)}
            y2={H}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
            opacity="0.35"
          />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(H / 4) * (i + 0.5)}
            x2={W}
            y2={(H / 4) * (i + 0.5)}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
            opacity="0.35"
          />
        ))}
        {/* route */}
        <path
          d={path}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={trip.status === "Delivered" ? undefined : "1 0"}
          opacity="0.9"
        />
        {/* waypoints */}
        {pts.slice(0, -1).map((p, i) => (
          <g key={i}>
            <circle
              cx={x(p.lng)}
              cy={y(p.lat)}
              r="4"
              fill="var(--bg-surface)"
              stroke="var(--brand)"
              strokeWidth="1.5"
            />
            {p.label && (
              <text
                x={x(p.lng)}
                y={y(p.lat) - 9}
                textAnchor="middle"
                className="fill-current text-muted-foreground"
                fontSize="9"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
        {/* live position */}
        <g>
          <circle cx={x(last.lng)} cy={y(last.lat)} r="10" fill="var(--brand)" opacity="0.2">
            <animate attributeName="r" values="8;13;8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={x(last.lng)} cy={y(last.lat)} r="5" fill="var(--brand)" />
          <text
            x={x(last.lng)}
            y={y(last.lat) + 18}
            textAnchor="middle"
            className="fill-current text-foreground"
            fontSize="10"
            fontWeight="600"
          >
            {trip.status === "Delivered" ? trip.destination : trip.vehicle}
          </text>
        </g>
      </svg>
    </div>
  );
}
