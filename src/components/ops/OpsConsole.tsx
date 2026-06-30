import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { STEP_LABELS } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusChip } from "@/components/StatusChip";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowUpRight,
  Truck,
  Upload,
  Flag,
  PackageCheck,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { ShipmentEvent, ShipmentEventType, Transaction } from "@/types";

const EVENT_ICON: Record<ShipmentEventType, typeof Activity> = {
  milestone: Flag,
  step_advanced: ArrowUpRight,
  transport_scheduled: Truck,
  pod_recorded: PackageCheck,
  warehouse_receipt: PackageCheck,
  container_update: Activity,
  gps_ping: MapPin,
  exception: AlertTriangle,
};

function currentStep(tx: Transaction): number {
  const ip = tx.steps.find((s) => s.status === "In Progress");
  if (ip) return ip.index;
  return Math.min(STEP_LABELS.length, tx.steps.filter((s) => s.status === "Completed").length + 1);
}

export function OpsConsole({ transaction }: { transaction: Transaction }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const canOperate = role === "source" || role === "admin";

  const eventsQ = useQuery({
    queryKey: ["shipment-events", transaction.id],
    queryFn: () => api.listShipmentEvents(transaction.id),
  });
  const events = useMemo(() => eventsQ.data ?? [], [eventsQ.data]);

  const step = currentStep(transaction);
  const nextStep = Math.min(STEP_LABELS.length, step + 1);
  const atEnd = step >= STEP_LABELS.length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shipment-events", transaction.id] });
    qc.invalidateQueries({ queryKey: ["tx", transaction.id] });
    qc.invalidateQueries({ queryKey: ["tx"] });
    qc.invalidateQueries({ queryKey: ["ae"] });
  };

  const advanceMut = useMutation({
    mutationFn: () => api.advanceShipmentStep(transaction.id, nextStep),
    onSuccess: () => {
      toast.success(`Advanced to step ${nextStep}: ${STEP_LABELS[nextStep - 1]}`);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to advance"),
  });

  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const scheduleMut = useMutation({
    mutationFn: () =>
      api.scheduleTransport({
        shipmentId: transaction.id,
        vehicle: vehicle.trim(),
        driver: driver.trim(),
      }),
    onSuccess: () => {
      toast.success("Transport scheduled");
      setVehicle("");
      setDriver("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to schedule"),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const podMut = useMutation({
    mutationFn: (file: File) => api.recordPOD(transaction.id, file),
    onSuccess: () => {
      toast.success("Proof of delivery captured");
      invalidate();
      qc.invalidateQueries({ queryKey: ["doc"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to record POD"),
  });

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold">Operations console</h3>
            <p className="text-xs text-muted-foreground">
              Step {step} of {STEP_LABELS.length} · {STEP_LABELS[step - 1]}
            </p>
          </div>
          <StatusChip status={transaction.currentStage} />
        </div>

        {!canOperate ? (
          <p className="rounded-lg border border-dashed bg-background/40 p-3 text-xs text-muted-foreground">
            Operational actions are available to source/operations roles. You can view the live
            timeline below.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ArrowUpRight className="h-4 w-4 text-accent" /> Advance milestone
              </div>
              <p className="mb-3 min-h-8 text-xs text-muted-foreground">
                {atEnd ? "Lifecycle complete." : `Next: ${STEP_LABELS[nextStep - 1]}`}
              </p>
              <Button
                size="sm"
                className="w-full"
                disabled={atEnd || advanceMut.isPending}
                onClick={() => advanceMut.mutate()}
              >
                {advanceMut.isPending ? "Advancing…" : "Advance step"}
              </Button>
            </div>

            <div className="rounded-lg border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-accent" /> Schedule transport
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="ops-vehicle" className="sr-only">
                    Vehicle
                  </Label>
                  <Input
                    id="ops-vehicle"
                    placeholder="Vehicle (e.g. CA 123-456)"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="ops-driver" className="sr-only">
                    Driver
                  </Label>
                  <Input
                    id="ops-driver"
                    placeholder="Driver name"
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!vehicle.trim() || !driver.trim() || scheduleMut.isPending}
                  onClick={() => scheduleMut.mutate()}
                >
                  {scheduleMut.isPending ? "Scheduling…" : "Schedule"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PackageCheck className="h-4 w-4 text-accent" /> Proof of delivery
              </div>
              <p className="mb-3 min-h-8 text-xs text-muted-foreground">
                Upload a signed POD; the shipment advances to “POD uploaded”.
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) podMut.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={podMut.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {podMut.isPending ? "Uploading…" : "Capture POD"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Event stream */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 font-display font-semibold">Operational timeline</h3>
        {eventsQ.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No operational events yet"
            description="Milestones, transport and POD will appear here as the shipment moves."
            icon={Activity}
          />
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 pl-5">
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: ShipmentEvent }) {
  const Icon = EVENT_ICON[event.eventType] ?? Activity;
  return (
    <li className="relative">
      <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card">
        <Icon className="h-3 w-3 text-accent" />
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" title={event.note ?? event.eventType}>
            {event.note ?? event.eventType.replace(/_/g, " ")}
          </div>
          <div className="text-xs text-muted-foreground">
            {event.actor} · {new Date(event.createdAt).toLocaleString("en-ZA")}
          </div>
        </div>
        {typeof event.step === "number" && (
          <span className="shrink-0 rounded-md border bg-background/60 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            Step {event.step}
          </span>
        )}
      </div>
    </li>
  );
}
