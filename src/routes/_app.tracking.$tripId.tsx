import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { CompanyLink } from "@/components/CompanyProfileDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusChip } from "@/components/StatusChip";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Trip, TripWaypoint } from "@/types";
import {
  Navigation,
  Flag,
  Route as RouteIcon,
  Gauge,
  Search,
  Phone,
  MessageSquare,
  Truck,
  FileCheck2,
  FileText,
  MapPin,
  IdCard,
  ShieldCheck,
  Package,
  Container as ContainerIcon,
  Warehouse as WarehouseIcon,
  Boxes,
  Receipt,
  Building2,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";

export const Route = createFileRoute("/_app/tracking/$tripId")({
  head: () => ({ meta: [{ title: "Tracking — Vantage" }] }),
  component: TrackingPage,
});

/* Deterministic per-trip telemetry extras (speed, driver profile) so the demo
   is stable without a telematics provider. Replaced by the FleetTracker seam. */
function hashN(s: string, mod: number, offset = 0): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return offset + ((h >>> 0) % mod);
}

const CORRIDOR_KM = 598; // Durban → Johannesburg (N3)

type Filter = "all" | "In Transit" | "Scheduled" | "Delivered";

function TrackingPage() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const tripsQ = useQuery({ queryKey: ["tp"], queryFn: api.listTrips });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const trips = useMemo(() => tripsQ.data ?? [], [tripsQ.data]);
  const trip = trips.find((t) => t.id === tripId || t.reference === tripId) ?? null;

  const waypointsQ = useQuery({
    queryKey: ["trip-route", trip?.id],
    queryFn: () => api.listTripWaypoints(trip!.id),
    enabled: !!trip,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (
        q &&
        !`${t.reference} ${t.shipmentRef ?? ""} ${t.cargo ?? ""} ${t.driver} ${t.vehicle} ${t.origin} ${t.destination}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [trips, search, filter]);

  const kpi = useMemo(() => {
    const inTransit = trips.filter((t) => t.status === "In Transit").length;
    const scheduled = trips.filter((t) => t.status === "Scheduled").length;
    const delivered = trips.filter((t) => t.status === "Delivered");
    const pod = delivered.length
      ? Math.round((delivered.filter((t) => t.podUploaded).length / delivered.length) * 100)
      : 100;
    return { inTransit, scheduled, delivered: delivered.length, pod };
  }, [trips]);

  if (tripsQ.isLoading) return <Skeleton className="h-[80vh]" />;

  return (
    <div>
      <PageHeader
        title="Live tracking"
        description="Fleet telemetry, route progress and every record linked to the trip — in one command view."
      />

      {/* Fleet KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Truck} label="In transit" value={String(kpi.inTransit)} tone="brand" live />
        <Kpi icon={CircleDot} label="Scheduled" value={String(kpi.scheduled)} tone="info" />
        <Kpi icon={Flag} label="Delivered" value={String(kpi.delivered)} tone="ok" />
        <Kpi
          icon={FileCheck2}
          label="POD compliance"
          value={`${kpi.pod}%`}
          tone={kpi.pod >= 90 ? "ok" : "warn"}
        />
      </div>

      {/* Map/canvas renders FIRST on stacked (narrow) layouts so tracking is
          immediately visible; the trip list moves below it. Side-by-side ≥ lg. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
        {/* ── Trip list ─────────────────────────────────────────────── */}
        <aside className="order-2 min-w-0 lg:order-1">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">
              Trips <span className="text-muted-foreground">{filtered.length}</span>
            </h2>
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trips, cargo, drivers…"
              className="pl-9"
            />
          </div>

          <div className="mb-3 inline-flex flex-wrap gap-1 rounded-lg border bg-inset p-0.5 text-xs">
            {(["all", "In Transit", "Scheduled", "Delivered"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-26rem)]">
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/tracking/$tripId", params: { tripId: t.id } })}
                  className={cn(
                    "group w-full rounded-xl border bg-card p-4 text-left transition hover:border-brand/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    trip?.id === t.id && "border-brand bg-brand/[0.04] ring-1 ring-brand/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-semibold tracking-tight">
                      {t.reference}
                    </span>
                    <TripStatusChip status={t.status} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground" title={t.cargo}>
                    {t.cargo ?? "General cargo"}
                    {t.shipmentRef ? ` · ${t.shipmentRef}` : ""}
                  </div>
                  <div className="mt-3 space-y-0">
                    <TimelineRow date={t.createdAt} place={t.origin} last={false} done />
                    <TimelineRow
                      date={t.etaAt}
                      place={t.destination}
                      last
                      done={t.status === "Delivered"}
                    />
                  </div>
                  {t.status === "In Transit" && (
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-inset">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${t.progressPct}%` }}
                      />
                    </div>
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No trips match your search.
              </li>
            )}
          </ul>
        </aside>

        {/* ── Tracking canvas ───────────────────────────────────────── */}
        <section className="order-1 min-w-0 lg:order-2">
          {!trip ? (
            <div className="flex h-96 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Select a trip to start tracking.
            </div>
          ) : (
            <TrackingCanvas
              trip={trip}
              waypoints={waypointsQ.data ?? []}
              loading={waypointsQ.isLoading}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  live,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
  tone: "brand" | "ok" | "info" | "warn";
  live?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "text-brand bg-brand/10",
    ok: "text-success bg-success/10",
    info: "text-info bg-info/10",
    warn: "text-warning bg-warning/10",
  };
  return (
    <div className="glass flex items-center gap-3 rounded-xl border p-4">
      <div className={cn("rounded-lg p-2", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
          {live && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
          )}
        </div>
        <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function TimelineRow({
  date,
  place,
  last,
  done,
}: {
  date?: string;
  place: string;
  last: boolean;
  done: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3 pb-3 last:pb-0">
      {!last && <span aria-hidden className="absolute left-[3px] top-3 h-full w-px bg-border" />}
      <span
        aria-hidden
        className={cn(
          "mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full",
          done ? "bg-brand" : "border border-muted-foreground/60 bg-transparent",
        )}
      />
      <div className="min-w-0 flex-1 text-xs">
        <span className="mr-2 inline-block w-12 shrink-0 tabular-nums text-muted-foreground">
          {date
            ? new Date(date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })
            : "—"}
        </span>
        <span className="text-foreground">{place}</span>
      </div>
    </div>
  );
}

function TripStatusChip({ status }: { status: Trip["status"] }) {
  const map: Record<Trip["status"], string> = {
    "In Transit": "bg-success/15 text-success",
    Scheduled: "bg-info/15 text-info",
    Delivered: "bg-brand/15 text-brand",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", map[status])}>
      {status === "In Transit" ? "In transit" : status}
    </span>
  );
}

/* ── Right panel: stats bar + map + linked records + tabbed detail ────── */

function TrackingCanvas({
  trip,
  waypoints,
  loading,
}: {
  trip: Trip;
  waypoints: TripWaypoint[];
  loading: boolean;
}) {
  const lastWp = waypoints[waypoints.length - 1];
  const speed = trip.status === "In Transit" ? hashN(trip.reference, 34, 58) : 0;
  const doneKm = Math.round((CORRIDOR_KM * trip.progressPct) / 100);
  const lastSeen = lastWp
    ? relativeTime(lastWp.recordedAt)
    : trip.status === "Scheduled"
      ? "Not departed"
      : "Just now";

  return (
    <div className="space-y-4">
      {/* Telemetry bar */}
      <div className="glass grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border p-4 md:grid-cols-4">
        <Stat
          icon={Navigation}
          label="Current location"
          value={trip.status === "Delivered" ? trip.destination : (lastWp?.label ?? trip.origin)}
        />
        <Stat icon={Flag} label="Last update" value={lastSeen} />
        <Stat icon={RouteIcon} label="Distance" value={`${doneKm} / ${CORRIDOR_KM} km`} />
        <Stat icon={Gauge} label="Current speed" value={speed ? `${speed} km/h` : "—"} />
      </div>

      {/* Map */}
      {loading ? (
        <Skeleton className="h-[360px] w-full rounded-xl" />
      ) : (
        <TrackingMap trip={trip} waypoints={waypoints} />
      )}

      {/* Linked records — every section connected to this trip */}
      <LinkedRecords trip={trip} />

      {/* Detail tabs */}
      <div className="rounded-xl border bg-card p-5">
        <Tabs defaultValue="order">
          <TabsList className="flex-wrap">
            <TabsTrigger value="order">Trip details</TabsTrigger>
            <TabsTrigger value="driver">Driver information</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact icon={Package} label="Shipment" value={trip.shipmentRef ?? "—"} />
              <Fact icon={FileText} label="Cargo" value={trip.cargo ?? "General cargo"} />
              <Fact icon={MapPin} label="Route" value={`${trip.origin} → ${trip.destination}`} />
              <Fact
                icon={FileCheck2}
                label="Proof of delivery"
                value={trip.podUploaded ? "Uploaded · signed" : "Pending delivery"}
              />
            </div>
          </TabsContent>

          <TabsContent value="driver" className="mt-4">
            <DriverPanel trip={trip} />
          </TabsContent>

          <TabsContent value="vehicle" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact icon={Truck} label="Registration" value={trip.vehicle} />
              <Fact
                icon={Truck}
                label="Type"
                value={hashN(trip.vehicle, 2) ? "Superlink flatbed" : "Tautliner 34t"}
              />
              <Fact icon={ShieldCheck} label="Roadworthy" value="Valid · 2026" />
              <Fact icon={Gauge} label="Telematics" value="GPS + door sensors" />
            </div>
          </TabsContent>

          <TabsContent value="customer" className="mt-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Client</div>
              <div className="mt-1 font-display text-lg font-semibold">
                <CompanyLink companyId={trip.clientCompanyId} name={trip.client ?? "—"} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the company name to open the full profile — invoicing, compliance and
                activity.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ── Linked records hub: connects the trip to every module ────────────── */

function LinkedRecords({ trip }: { trip: Trip }) {
  const ref = trip.shipmentRef;
  const whQ = useQuery({ queryKey: ["rep-wh"], queryFn: api.listWarehouseJobs, enabled: !!ref });
  const contQ = useQuery({ queryKey: ["rep-cont"], queryFn: api.listContainerJobs, enabled: !!ref });
  const cargoQ = useQuery({ queryKey: ["rep-cargo"], queryFn: api.listCargoHandling, enabled: !!ref });
  const invQ = useQuery({ queryKey: ["inv"], queryFn: api.listInvoices, enabled: !!ref });
  const docsQ = useQuery({ queryKey: ["doc"], queryFn: api.listDocuments, enabled: !!ref });

  if (!ref) return null;

  const wh = (whQ.data ?? []).find((j) => j.shipmentRef === ref);
  const cont = (contQ.data ?? []).find((c) => c.shipmentRef === ref);
  const cargo = (cargoQ.data ?? []).find((c) => c.shipmentRef === ref);
  const inv = (invQ.data ?? []).find((i) => i.transactionRef === ref);
  const docCount = (docsQ.data ?? []).filter((d) => d.transactionRef === ref).length;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold">Linked records</h3>
        <span className="text-xs text-muted-foreground">Everything connected to {ref}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LinkedCard
          icon={Package}
          title="Shipment"
          value={ref}
          sub="Lifecycle, quotes & agreement"
          to={`/transactions/${ref}`}
        />
        <LinkedCard
          icon={FileText}
          title="Documents"
          value={`${docCount} on file`}
          sub="Versioned & e-signature ready"
          to="/documents"
        />
        {inv ? (
          <LinkedCard
            icon={Receipt}
            title="Invoice"
            value={inv.number}
            sub={`${formatZAR(inv.amountZAR)} · ${inv.status}`}
            to="/payments"
            chip={<StatusChip status={inv.status} />}
          />
        ) : (
          <LinkedCard
            icon={Receipt}
            title="Invoice"
            value="Not yet issued"
            sub="Raised on dispatch"
            to="/payments"
            muted
          />
        )}
        {wh && (
          <LinkedCard
            icon={WarehouseIcon}
            title="Warehouse job"
            value={wh.reference}
            sub={`${wh.warehouseType} · ${wh.location}`}
            to="/warehouse"
            chip={<StatusChip status={wh.status} />}
          />
        )}
        {cont && (
          <LinkedCard
            icon={ContainerIcon}
            title="Container"
            value={cont.containerNo}
            sub={`${cont.type}${cont.vessel ? ` · ${cont.vessel}` : ""}`}
            to="/containers"
            chip={<StatusChip status={cont.status} />}
          />
        )}
        {cargo && (
          <LinkedCard
            icon={Boxes}
            title="Cargo handling"
            value={cargo.reference}
            sub={`${cargo.operation} · ${Math.round(cargo.weightKg).toLocaleString("en-ZA")} kg`}
            to="/cargo"
            chip={
              <StatusChip
                status={
                  cargo.condition === "Good"
                    ? "Verified"
                    : cargo.condition === "Damaged"
                      ? "Failed"
                      : "Pending"
                }
                label={cargo.condition}
              />
            }
          />
        )}
        {trip.client && (
          <LinkedCard
            icon={Building2}
            title="Customer"
            value={trip.client}
            sub="Profile, invoicing & compliance"
            companyId={trip.clientCompanyId}
          />
        )}
      </div>
    </div>
  );
}

function LinkedCard({
  icon: Icon,
  title,
  value,
  sub,
  to,
  chip,
  muted,
  companyId,
}: {
  icon: typeof Package;
  title: string;
  value: string;
  sub: string;
  to?: string;
  chip?: React.ReactNode;
  muted?: boolean;
  companyId?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </div>
        {to && (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-brand" />
        )}
      </div>
      <div
        className={cn("mt-1.5 truncate text-sm font-semibold", muted && "text-muted-foreground")}
        title={value}
      >
        {value}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground" title={sub}>
          {sub}
        </span>
        {chip}
      </div>
    </>
  );
  const cls =
    "group block rounded-lg border bg-inset/40 p-3.5 text-left transition hover:border-brand/50 hover:bg-surface-2/40";
  if (companyId) {
    return (
      <div className={cls}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3.5 w-3.5" /> {title}
          </div>
        </div>
        <div className="mt-1.5 truncate text-sm font-semibold">
          <CompanyLink companyId={companyId} name={value} />
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>
      </div>
    );
  }
  if (to)
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  return <div className={cls}>{body}</div>;
}

function relativeTime(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Navigation;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-medium" title={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
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

function DriverPanel({ trip }: { trip: Trip }) {
  const initials = trip.driver
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const years = hashN(trip.driver, 14, 4);
  const idNo = `${70 + hashN(trip.driver, 20)}••••••••${hashN(trip.driver, 90, 10)}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 font-display text-sm font-bold text-brand">
          {initials}
        </div>
        <div>
          <div className="font-display font-semibold">{trip.driver}</div>
          <div className="text-xs text-muted-foreground">Driver</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() =>
            toast.info(`Calling ${trip.driver}… (voice channel ships with the telematics integration)`)
          }
        >
          <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info("In-app driver chat arrives with the driver mobile app (Phase 2).")}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
        </Button>
      </div>
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={ShieldCheck} label="Experience" value={`${years} years`} />
        <Fact icon={IdCard} label="Licence" value="Code 14 (EC)" />
        <Fact icon={IdCard} label="ID number" value={idNo} />
        <Fact icon={ShieldCheck} label="PrDP" value="Valid · Goods" />
      </div>
    </div>
  );
}

/* ── Route map ────────────────────────────────────────────────────────── */

function TrackingMap({ trip, waypoints }: { trip: Trip; waypoints: TripWaypoint[] }) {
  const W = 900;
  const H = 400;
  const PAD = 52;

  const pts: { lat: number; lng: number; label?: string }[] =
    waypoints.length > 0
      ? [...waypoints, { lat: trip.lat, lng: trip.lng }]
      : [
          { lat: -29.8587, lng: 31.0218, label: trip.origin },
          { lat: trip.lat, lng: trip.lng },
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
  const first = pts[0];
  const destX = W - PAD;
  const destY = PAD;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-inset/40">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Live route map for ${trip.reference}`}
      >
        <defs>
          <radialGradient id="mapGlow" cx="28%" cy="25%" r="85%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="routeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="1" />
          </linearGradient>
          <filter id="routeBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#mapGlow)" />

        {/* road grid */}
        {Array.from({ length: 14 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(W / 14) * (i + 0.5)}
            y1={0}
            x2={(W / 14) * (i + 0.5)}
            y2={H}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
            opacity="0.28"
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(H / 7) * (i + 0.5)}
            x2={W}
            y2={(H / 7) * (i + 0.5)}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
            opacity="0.28"
          />
        ))}

        {/* faint secondary roads */}
        <path
          d={`M0,${H * 0.72} C ${W * 0.3},${H * 0.6} ${W * 0.55},${H * 0.85} ${W},${H * 0.62}`}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="1"
          opacity="0.35"
        />
        <path
          d={`M${W * 0.15},0 C ${W * 0.25},${H * 0.4} ${W * 0.1},${H * 0.7} ${W * 0.22},${H}`}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="1"
          opacity="0.35"
        />

        {/* remaining leg */}
        {trip.status !== "Delivered" && (
          <path
            d={`M${x(last.lng)},${y(last.lat)} Q${(x(last.lng) + destX) / 2 + 46},${(y(last.lat) + destY) / 2} ${destX},${destY}`}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth="1.5"
            strokeDasharray="5 6"
            opacity="0.55"
          />
        )}

        {/* travelled route: glow underlay + gradient stroke */}
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth="7" opacity="0.35" filter="url(#routeBlur)" />
        <path
          d={path}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* waypoints */}
        {pts.slice(0, -1).map((p, i) => (
          <g key={i}>
            <circle
              cx={x(p.lng)}
              cy={y(p.lat)}
              r="4.5"
              fill="var(--bg-surface)"
              stroke="var(--brand)"
              strokeWidth="1.5"
            />
            {p.label && (
              <text
                x={x(p.lng)}
                y={y(p.lat) - 11}
                textAnchor="middle"
                className="fill-current text-muted-foreground"
                fontSize="10"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {/* origin marker */}
        <g>
          <circle cx={x(first.lng)} cy={y(first.lat)} r="7" fill="var(--brand)" opacity="0.18" />
          <circle cx={x(first.lng)} cy={y(first.lat)} r="4" fill="var(--brand)" opacity="0.7" />
        </g>

        {/* destination flag */}
        {trip.status !== "Delivered" && (
          <g>
            <circle
              cx={destX}
              cy={destY}
              r="5.5"
              fill="var(--bg-surface)"
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth="1.5"
            />
            <text
              x={destX - 11}
              y={destY + 4}
              textAnchor="end"
              className="fill-current text-muted-foreground"
              fontSize="10"
            >
              {trip.destination}
            </text>
          </g>
        )}

        {/* live position */}
        <g>
          <circle cx={x(last.lng)} cy={y(last.lat)} r="13" fill="var(--brand)" opacity="0.16">
            <animate attributeName="r" values="10;18;10" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.22;0.06;0.22" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={x(last.lng)}
            cy={y(last.lat)}
            r="6.5"
            fill="var(--brand)"
            stroke="var(--bg-app)"
            strokeWidth="2.5"
          />
        </g>

        {/* corridor label */}
        <text
          x={W / 2}
          y={H - 14}
          textAnchor="middle"
          className="fill-current text-muted-foreground"
          fontSize="10"
          letterSpacing="2"
        >
          N3 CORRIDOR · {trip.origin.toUpperCase()} → {trip.destination.toUpperCase()}
        </text>
      </svg>

      {/* floating chips */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border bg-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
        <span className="text-muted-foreground">From</span>{" "}
        <span className="font-medium">{trip.origin}</span>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-lg border bg-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
        <span className="text-muted-foreground">To</span>{" "}
        <span className="font-medium">{trip.destination}</span>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border bg-surface/90 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded-full bg-brand" /> Travelled
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block h-[3px] w-5 rounded-full border-t border-dashed border-muted-foreground" />{" "}
          Remaining
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border bg-surface/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
        <span className="font-medium">{trip.vehicle}</span>{" "}
        <span className="text-muted-foreground">· {trip.driver}</span>
      </div>
    </div>
  );
}
