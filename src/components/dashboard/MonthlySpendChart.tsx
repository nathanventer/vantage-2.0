import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatZAR } from "@/lib/format";
import type { MonthlySpendPoint } from "@/types";

const GRID = "color-mix(in oklab, var(--color-border) 100%, transparent)";
const AXIS = "var(--color-muted-foreground)";

function SpendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; value: number; color: string }[];
}) {
  if (!active || !payload?.length) return null;
  const spend = payload.find((p) => p.dataKey === "spendZAR")?.value;
  const shipments = payload.find((p) => p.dataKey === "shipments")?.value;

  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {spend != null && (
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[#2f6bff]" />
              Spend
            </span>
            <span className="text-sm font-semibold tabular-nums">{formatZAR(spend)}</span>
          </div>
        )}
        {shipments != null && (
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-[#34d399]" />
              Shipments
            </span>
            <span className="text-sm font-semibold tabular-nums">{shipments}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MonthlySpendChart({ data }: { data: MonthlySpendPoint[] }) {
  const latest = data.at(-1);
  const peak = data.length
    ? data.reduce((best, row) => (row.spendZAR > best.spendZAR ? row : best), data[0])
    : { spendZAR: 0, month: "—", shipments: 0 };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold tracking-tight">Monthly spend & volume</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">12-month logistics trend</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-inset px-2.5 py-1 text-[11px] font-medium">
            <span className="h-2 w-2 rounded-full bg-[#2f6bff]" />
            Spend
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-inset px-2.5 py-1 text-[11px] font-medium">
            <span className="h-2 w-2 rounded-full bg-[#34d399]" />
            Shipments
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-inset/50 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Latest</div>
          <div className="mt-0.5 font-display text-base font-semibold tabular-nums">{formatZAR(latest?.spendZAR ?? 0)}</div>
        </div>
        <div className="rounded-lg border bg-inset/50 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Peak month</div>
          <div className="mt-0.5 font-display text-base font-semibold tabular-nums">{peak.month}</div>
        </div>
        <div className="col-span-2 rounded-lg border bg-inset/50 px-3 py-2.5 sm:col-span-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Shipments</div>
          <div className="mt-0.5 font-display text-base font-semibold tabular-nums">{latest?.shipments ?? 0}</div>
        </div>
      </div>

      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f6bff" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2f6bff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              stroke={AXIS}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              yAxisId="spend"
              stroke={AXIS}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R${(v / 1_000_000).toFixed(1)}M`}
              width={48}
            />
            <YAxis
              yAxisId="shipments"
              orientation="right"
              stroke={AXIS}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<SpendTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
            <Area
              yAxisId="spend"
              type="monotone"
              dataKey="spendZAR"
              stroke="#2f6bff"
              strokeWidth={2.5}
              fill="url(#spendArea)"
              dot={false}
              activeDot={{ r: 4, fill: "#2f6bff", stroke: "var(--bg-surface)", strokeWidth: 2 }}
            />
            <Line
              yAxisId="shipments"
              type="monotone"
              dataKey="shipments"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#34d399", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#34d399", stroke: "var(--bg-surface)", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
