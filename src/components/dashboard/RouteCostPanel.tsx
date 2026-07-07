import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MapPin } from "lucide-react";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RouteCostPoint } from "@/types";

const COLORS = ["#2f6bff", "#6e5bf2", "#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#a78bfa"];

function RouteTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RouteCostPoint & { share: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="max-w-[200px] text-xs font-medium leading-snug">{row.route}</p>
      <p className="mt-1 font-display text-sm font-semibold tabular-nums">
        {formatZAR(row.costZAR)}
      </p>
      <p className="text-[11px] text-muted-foreground">{row.share.toFixed(1)}% of total</p>
    </div>
  );
}

const TOP_ROUTES = 5;

export function RouteCostPanel({ routes }: { routes: RouteCostPoint[] }) {
  const total = routes.reduce((sum, r) => sum + r.costZAR, 0);
  const enriched = routes.map((r) => ({
    ...r,
    share: total > 0 ? (r.costZAR / total) * 100 : 0,
  }));
  const visible = enriched.slice(0, TOP_ROUTES);
  const hiddenCount = enriched.length - visible.length;

  if (routes.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-inset/40 px-6 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No route cost data yet</p>
        <p className="max-w-[220px] text-xs text-muted-foreground">
          Costs appear here once shipments have accepted quotes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold tracking-tight">Cost by route</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Logistics spend by corridor</p>
        </div>
        <div className="rounded-lg bg-brand-soft px-3 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Total
          </div>
          <div className="font-display text-lg font-semibold tabular-nums leading-tight">
            {formatZAR(total)}
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,140px)_1fr] lg:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={enriched}
                dataKey="costZAR"
                nameKey="route"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={3}
                stroke="transparent"
              >
                {enriched.map((entry, i) => (
                  <Cell key={entry.route} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<RouteTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Routes
            </span>
            <span className="font-display text-2xl font-bold tabular-nums">{routes.length}</span>
          </div>
        </div>

        <ul className="max-h-[240px] space-y-3 overflow-y-auto pr-1">
          {visible.map((route, i) => (
            <li key={route.route} className="group">
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-sm font-medium leading-snug">{route.route}</span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatZAR(route.costZAR)}
                  </div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    {route.share.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-inset">
                <div
                  className={cn("h-full rounded-full transition-all duration-500 ease-out")}
                  style={{
                    width: `${route.share}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                    opacity: 0.85,
                  }}
                />
              </div>
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="pt-1 text-center text-[11px] text-muted-foreground">
              +{hiddenCount} more route{hiddenCount === 1 ? "" : "s"}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
