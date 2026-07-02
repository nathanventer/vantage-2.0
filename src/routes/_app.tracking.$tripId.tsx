import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { CompanyLink } from "@/components/CompanyProfileDialog";
import { LiveMap } from "@/components/LiveMap";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusChip } from "@/components/StatusChip";
import { formatZAR } from "@/lib/format";
import {
  buildActivityFeed,
  buildTimeline,
  deriveOps,
  hashN,
  STATUS_COLORS,
  type OpsStatus,
  type TransportMode,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Trip } from "@/types";
import {
  Navigation,
  Flag,
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
  Timer,
  AlertTriangle,
  Radio,
} from "lucide-react";

export const Route = createFileRoute("/_app/tracking/$tripId")({
  head: () => ({ meta: [{ title: "Live Shipment Tracking — Vantage" }] }),
  component: TrackingPage,
});

type StatusFilter = "all" | OpsStatus;
type ModeFilter = "all" | TransportMode;

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "In Transit",
  "At Port",
  "Customs Clearance",
  "Delayed",
  "Delivered",
  "Awaiting Collection",
];
const MODE_FILTERS: ModeFilter[] = [
  "all",
  "Road Freight",
  "Sea Freight",
  "Air Freight",
  "Rail",
  "Warehouse Transfer",
];
const PROVINCES = [
  "all",
  "Gauteng",
  "KwaZulu-Natal",
  "Western Cape",
  "Eastern Cape",
  "Free State",
  "Mpumalanga",
  "Limpopo",
  "Northern Cape",
  "North West",
];

function TrackingPage() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const tripsQ = useQuery({ queryKey: ["tp"], queryFn: api.listTrips });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [province, setProvince] = useState("all");

  const trips = useMemo(() => tripsQ.data ?? [], [tripsQ.data]);
  const trip = trips.find((t) => t.id === tripId || t.reference === tripId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      const ops = deriveOps(t);
      if (statusFilter !== "all" && ops.status !== statusFilter) return false;
      if (modeFilter !== "all" && ops.mode !== modeFilter) return false;
      if (province !== "all" && ops.originProvince !== province && ops.destProvince !== province)
        return false;
      if (
        q &&
        !`${t.reference} ${t.shipmentRef ?? ""} ${t.cargo ?? ""} ${t.client ?? ""} ${t.driver} ${t.vehicle} ${t.origin} ${t.destination}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [trips, search, statusFilter, modeFilter, province]);

  const kpi = useMemo(() => {
    const withOps = trips.map((t) => ({ t, ops: deriveOps(t) }));
    const active = withOps.filter((x) => x.t.status === "In Transit");
    const delivered = withOps.filter((x) => x.ops.status === "Delivered");
    const etas = active.map((x) => x.ops.etaHours ?? 0).filter(Boolean);
    return {
      active: active.length,
      delayed: withOps.filter((x) => x.ops.status === "Delayed").length,
      onTime: delivered.filter((x) => x.t.podUploaded).length,
      customs: withOps.filter((x) => x.ops.status === "Customs Clearance").length,
      vehicles: new Set(active.map((x) => x.t.vehicle)).size,
      avgEta: etas.length ? Math.round(etas.reduce((s, n) => s + n, 0) / etas.length) : 0,
    };
  }, [trips]);

  if (tripsQ.isLoading) return <Skeleton className="h-[80vh]" />;

  return (
    <div>
      <PageHeader
        title="Live Shipment Tracking"
        description="Real-time visibility across South African trade routes, ports, warehouses, customs points, and delivery networks."
      />

      {/* Control-tower KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Truck} label="Active shipments" value={String(kpi.active)} tone="brand" live />
        <Kpi
          icon={AlertTriangle}
          label="Delayed"
          value={String(kpi.delayed)}
          tone={kpi.delayed > 0 ? "warn" : "ok"}
        />
        <Kpi icon={Flag} label="On-time deliveries" value={String(kpi.onTime)} tone="ok" />
        <Kpi icon={ShieldCheck} label="Customs pending" value={String(kpi.customs)} tone="purple" />
        <Kpi icon={Radio} label="Vehicles online" value={String(kpi.vehicles)} tone="info" />
        <Kpi icon={Timer} label="Average ETA" value={`${kpi.avgEta}h`} tone="info" />
      </div>

      {/* Map/canvas renders FIRST on stacked (narrow) layouts; side-by-side ≥ lg */}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
        {/* ── Search & filter panel ─────────────────────────────────── */}
        <aside className="order-2 min-w-0 lg:order-1">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">
              Shipments <span className="text-muted-foreground">{filtered.length}</span>
            </h2>
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Shipment, client, container, truck…"
              className="pl-9"
            />
          </div>

          <div className="mb-2 flex flex-wrap gap-1 rounded-lg border bg-inset p-1 text-xs">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "rounded-md px-2 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  statusFilter === f
                    ? "bg-surface-2 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
              aria-label="Transport type"
              className="h-9 w-full rounded-md border border-input bg-inset px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MODE_FILTERS.map((m) => (
                <option key={m} value={m}>
                  {m === "all" ? "All transport types" : m}
                </option>
              ))}
            </select>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              aria-label="Province"
              className="h-9 w-full rounded-md border border-input bg-inset px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All provinces" : p}
                </option>
              ))}
            </select>
          </div>

          <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-30rem)]">
            {filtered.map((t) => {
              const ops = deriveOps(t);
              return (
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
                      <span className="font-display font-semibold tracking-tight">{t.reference}</span>
                      <OpsChip status={ops.status} risk={ops.risk} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground" title={t.cargo}>
                      {t.cargo ?? "General cargo"} · {ops.mode}
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
                          className="h-full rounded-full transition-all"
                          style={{ width: `${t.progressPct}%`, background: ops.color }}
                        />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No shipments match your filters.
              </li>
            )}
          </ul>
        </aside>

        {/* ── Tracking canvas ───────────────────────────────────────── */}
        <section className="order-1 min-w-0 lg:order-2">
          {!trip ? (
            <div className="flex h-96 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Select a shipment to start tracking.
            </div>
          ) : (
            <TrackingCanvas
              trip={trip}
              trips={filtered}
              onSelect={(id) => navigate({ to: "/tracking/$tripId", params: { tripId: id } })}
            />
          )}
        </section>
      </div>
    </div>
  );
}

/* ── KPI cards ─────────────────────────────────────────────────────────── */

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
  tone: "brand" | "ok" | "info" | "warn" | "purple";
  live?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "text-brand bg-brand/10",
    ok: "text-success bg-success/10",
    info: "text-info bg-info/10",
    warn: "text-warning bg-warning/10",
    purple: "bg-[#a78bfa1a] text-[#a78bfa]",
  };
  return (
    <div className="glass flex items-center gap-3 rounded-xl border p-4">
      <div className={cn("rounded-lg p-2", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="truncate">{label}</span>
          {live && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
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

function OpsChip({ status, risk }: { status: OpsStatus; risk?: boolean }) {
  const color = risk ? "#f87171" : STATUS_COLORS[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: `${color}22`, color }}
    >
      {risk ? "High risk" : status}
    </span>
  );
}

/* ── Right canvas: telemetry + map + activity + detail ─────────────────── */

function TrackingCanvas({
  trip,
  trips,
  onSelect,
}: {
  trip: Trip;
  trips: Trip[];
  onSelect: (tripId: string) => void;
}) {
  const ops = deriveOps(trip);
  const speed = trip.status === "In Transit" ? hashN(trip.reference, 34, 58) : 0;

  return (
    <div className="space-y-4">
      {/* Telemetry bar */}
      <div className="glass grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border p-4 md:grid-cols-4">
        <Stat
          icon={Navigation}
          label="Current status"
          value={ops.risk ? "High risk — escalated" : ops.status}
        />
        <Stat
          icon={Timer}
          label="Estimated arrival"
          value={ops.etaHours != null ? `${ops.etaHours} hours` : "Delivered"}
        />
        <Stat icon={MapPin} label="Corridor" value={`${trip.origin} → ${trip.destination}`} />
        <Stat icon={Gauge} label="Current speed" value={speed ? `${speed} km/h` : "—"} />
      </div>

      {/* Control-tower map */}
      <LiveMap trips={trips} selected={trip} onSelect={onSelect} />

      {/* Live activity feed */}
      <ActivityFeed trips={trips} />

      {/* Linked records — every module connected to this shipment */}
      <LinkedRecords trip={trip} />

      {/* Detail tabs */}
      <div className="rounded-xl border bg-card p-5">
        <Tabs defaultValue="timeline">
          <TabsList className="flex-wrap">
            <TabsTrigger value="timeline">Journey timeline</TabsTrigger>
            <TabsTrigger value="order">Shipment details</TabsTrigger>
            <TabsTrigger value="driver">Driver information</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <JourneyTimeline trip={trip} />
          </TabsContent>

          <TabsContent value="order" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact icon={Package} label="Shipment" value={trip.shipmentRef ?? "—"} />
              <Fact icon={FileText} label="Cargo" value={trip.cargo ?? "General cargo"} />
              <Fact icon={Truck} label="Transport mode" value={ops.mode} />
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

/* ── Live activity ticker ──────────────────────────────────────────────── */

function ActivityFeed({ trips }: { trips: Trip[] }) {
  const events = useMemo(() => buildActivityFeed(trips), [trips]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  if (events.length === 0) return null;
  const visible = [0, 1, 2].map((i) => events[(tick + i) % events.length]);

  return (
    <div className="glass rounded-xl border p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Live activity
      </div>
      <ul className="space-y-1.5">
        {visible.map((e) => (
          <li key={`${e.id}-${e.minsAgo}`} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate" title={e.text}>
              {e.text}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {e.minsAgo}m ago
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Journey timeline ──────────────────────────────────────────────────── */

function JourneyTimeline({ trip }: { trip: Trip }) {
  const steps = buildTimeline(trip);
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                "absolute left-[7px] top-5 h-full w-px",
                s.done ? "bg-brand/50" : "bg-border",
              )}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
              s.done ? "border-brand bg-brand/30" : "border-border bg-inset",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className={cn("text-sm font-medium", !s.done && "text-muted-foreground")}>
              {s.label}
            </div>
            {s.at && s.done && (
              <div className="text-xs text-muted-foreground">
                {new Date(s.at).toLocaleString("en-ZA", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Linked records hub ────────────────────────────────────────────────── */

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
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
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

/* ── Small pieces ──────────────────────────────────────────────────────── */

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
