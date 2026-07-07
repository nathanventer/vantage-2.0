import { useMemo, useState } from "react";
import { ArrowDownUp, MapPin } from "lucide-react";
import { formatZAR } from "@/lib/format";
import { benchmarkKey } from "@/lib/pulse";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ModeBadge, MoMChip } from "@/components/pulse/pulseUi";
import type { RateBenchmark, TransportMode } from "@/types";

type SortKey = "lane" | "median" | "mom";

const MODES: (TransportMode | "all")[] = ["all", "Sea", "Road", "Air", "Rail"];

type PulseBenchmarksPanelProps = {
  benchmarks: RateBenchmark[];
  selectedKey: string;
  onSelect: (key: string) => void;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  mode: TransportMode | "all";
  onModeChange: (mode: TransportMode | "all") => void;
};

export function PulseBenchmarksPanel({
  benchmarks,
  selectedKey,
  onSelect,
  loading,
  search,
  onSearchChange,
  mode,
  onModeChange,
}: PulseBenchmarksPanelProps) {
  const [sort, setSort] = useState<SortKey>("median");

  const filtered = useMemo(
    () =>
      benchmarks.filter(
        (b) =>
          (mode === "all" || b.mode === mode) &&
          (!search.trim() || b.lane.toLowerCase().includes(search.toLowerCase())),
      ),
    [benchmarks, mode, search],
  );

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (sort === "lane") rows.sort((a, b) => a.lane.localeCompare(b.lane));
    else if (sort === "median") rows.sort((a, b) => a.medianZAR - b.medianZAR);
    else rows.sort((a, b) => a.momChangePct - b.momChangePct);
    return rows;
  }, [filtered, sort]);

  const cycleSort = () => {
    setSort((s) => (s === "median" ? "mom" : s === "mom" ? "lane" : "median"));
  };

  return (
    <div className="glass flex h-full min-h-[32rem] flex-col rounded-xl border sheen">
      <div className="border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold tracking-tight">Market benchmarks</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {filtered.length} lane{filtered.length === 1 ? "" : "s"} · click to analyse
            </p>
          </div>
          <button
            type="button"
            onClick={cycleSort}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-inset px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            title="Cycle sort: median → MoM → lane"
          >
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
            Sort: {sort === "median" ? "Median" : sort === "mom" ? "MoM" : "Lane"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pulse-search" className="text-[11px] uppercase tracking-wide">
              Search lane
            </Label>
            <Input
              id="pulse-search"
              placeholder="e.g. Durban, Johannesburg…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 bg-background/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  mode === m
                    ? "border-brand/40 bg-brand/15 text-brand"
                    : "border-border/60 bg-inset/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "all" ? "All modes" : m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No lanes match" description="Adjust your search or mode filter." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
              <tr className="border-b text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Lane</th>
                <th className="px-2 py-2.5">Mode</th>
                <th className="px-2 py-2.5 text-right">Median</th>
                <th className="px-4 py-2.5 text-right">MoM</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => {
                const key = benchmarkKey(b);
                const active = key === selectedKey;
                return (
                  <tr
                    key={key}
                    className={cn(
                      "cursor-pointer border-b border-border/30 transition-colors",
                      active
                        ? "bg-brand/10 shadow-[inset_3px_0_0_var(--color-brand)]"
                        : "hover:bg-inset/50",
                    )}
                    onClick={() => onSelect(key)}
                    aria-selected={active}
                  >
                    <td className="max-w-[11rem] px-4 py-3">
                      <div className="flex items-start gap-2">
                        <MapPin
                          className={cn(
                            "mt-0.5 h-3.5 w-3.5 shrink-0",
                            active ? "text-brand" : "text-muted-foreground",
                          )}
                          aria-hidden
                        />
                        <span className={cn("truncate font-medium", active && "text-foreground")} title={b.lane}>
                          {b.lane}
                        </span>
                      </div>
                      <p className="mt-0.5 pl-5 text-[11px] tabular-nums text-muted-foreground">
                        {b.samples} obs · {formatZAR(b.lowZAR)}–{formatZAR(b.highZAR)}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <ModeBadge mode={b.mode} />
                    </td>
                    <td className="px-2 py-3 text-right font-display text-sm font-semibold tabular-nums">
                      {formatZAR(b.medianZAR)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoMChip pct={b.momChangePct} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
