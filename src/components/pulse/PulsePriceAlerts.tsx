import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Bell, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/services";
import { formatZAR } from "@/lib/format";
import { alertPresets, benchmarkKey } from "@/lib/pulse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeBadge } from "@/components/pulse/pulseUi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PriceAlert, RateBenchmark } from "@/types";

type PulsePriceAlertsProps = {
  benchmark?: RateBenchmark;
  alerts: PriceAlert[];
  loading: boolean;
  onSelectLane: (key: string) => void;
};

export function PulsePriceAlerts({
  benchmark,
  alerts,
  loading,
  onSelectLane,
}: PulsePriceAlertsProps) {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("below");

  useEffect(() => {
    if (benchmark) {
      setThreshold(String(benchmark.medianZAR));
      setDirection("below");
    }
  }, [benchmark?.lane, benchmark?.mode, benchmark?.medianZAR]);

  const createMut = useMutation({
    mutationFn: (input?: { thresholdZAR?: number; direction?: "above" | "below" }) =>
      api.createPriceAlert({
        lane: benchmark?.lane ?? "",
        mode: benchmark?.mode ?? "Sea",
        thresholdZAR: input?.thresholdZAR ?? Number(threshold),
        direction: input?.direction ?? direction,
      }),
    onSuccess: () => {
      toast.success("Price alert saved");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create alert"),
  });

  const applyPreset = (preset: ReturnType<typeof alertPresets>[number], create = false) => {
    setThreshold(String(preset.thresholdZAR));
    setDirection(preset.direction);
    if (create && benchmark) {
      createMut.mutate({ thresholdZAR: preset.thresholdZAR, direction: preset.direction });
    }
  };

  const presets = benchmark ? alertPresets(benchmark) : [];
  const laneAlerts = benchmark
    ? alerts.filter((a) => a.lane === benchmark.lane && a.mode === benchmark.mode)
    : alerts;

  return (
    <div className="glass rounded-xl border p-5 sheen">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-display font-semibold tracking-tight">
            <Bell className="h-4 w-4 text-brand" aria-hidden />
            Set price alerts
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {benchmark
              ? `Watch ${benchmark.lane} · ${benchmark.mode} for drops below or rises above your threshold`
              : "Select a lane to configure drop / rise alerts"}
          </p>
        </div>
        {benchmark && <ModeBadge mode={benchmark.mode} />}
      </div>

      {benchmark && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((preset) => {
            const isDrop = preset.direction === "below";
            const Icon = isDrop ? TrendingDown : TrendingUp;
            const active =
              direction === preset.direction && Number(threshold) === preset.thresholdZAR;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                onDoubleClick={() => applyPreset(preset, true)}
                className={cn(
                  "group rounded-xl border p-3 text-left transition",
                  active
                    ? "border-brand/40 bg-brand/10"
                    : "border-border/50 bg-inset/30 hover:border-brand/25 hover:bg-inset/50",
                )}
                title="Click to set · double-click to save immediately"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border",
                      isDrop ? "border-ok-bd bg-ok-bg text-ok" : "border-warn-bd bg-warn-bg text-warn",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium">{preset.label}</span>
                </div>
                <p className="mt-2 font-display text-base font-semibold tabular-nums">
                  {formatZAR(preset.thresholdZAR)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{preset.description}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border/50 bg-inset/30 p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Custom threshold
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="alert-threshold" className="text-xs">
              Threshold (ZAR)
            </Label>
            <Input
              id="alert-threshold"
              type="number"
              placeholder="100000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="h-9 w-44 bg-background/60 tabular-nums"
              disabled={!benchmark}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Alert when rate</Label>
            <div className="flex rounded-lg border bg-background/60 p-0.5">
              <button
                type="button"
                disabled={!benchmark}
                onClick={() => setDirection("below")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  direction === "below"
                    ? "bg-ok text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !benchmark && "opacity-50",
                )}
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                Drops below
              </button>
              <button
                type="button"
                disabled={!benchmark}
                onClick={() => setDirection("above")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  direction === "above"
                    ? "bg-warn font-semibold text-app shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !benchmark && "opacity-50",
                )}
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                Rises above
              </button>
            </div>
          </div>
          <Button
            disabled={!benchmark || !threshold || createMut.isPending}
            onClick={() => createMut.mutate({})}
          >
            {createMut.isPending ? "Saving…" : "Save alert"}
          </Button>
        </div>
        {benchmark && threshold && (
          <p className="mt-3 text-xs text-muted-foreground">
            You&apos;ll be notified when the lane median{" "}
            <span className="font-medium text-foreground">
              {direction === "below" ? "drops below" : "rises above"} {formatZAR(Number(threshold))}
            </span>
            .
          </p>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-20" />
      ) : laneAlerts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No active alerts for this lane yet. Use a preset above or set a custom threshold.
        </p>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your alerts
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {laneAlerts.map((a) => {
              const key = `${a.lane}|${a.mode}`;
              const active = benchmark && key === benchmarkKey(benchmark);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelectLane(key)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition",
                      active
                        ? "border-brand/40 bg-brand/10"
                        : "border-border/50 bg-background/40 hover:bg-inset/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={a.lane}>
                        {a.lane}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.direction === "below" ? "Drops below" : "Rises above"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {formatZAR(a.thresholdZAR)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!benchmark && alerts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            All alerts
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelectLane(`${a.lane}|${a.mode}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 p-3 text-left text-sm hover:bg-inset/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.lane}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.mode} · {a.direction === "below" ? "drops below" : "rises above"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {formatZAR(a.thresholdZAR)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
