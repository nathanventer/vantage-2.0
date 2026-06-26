import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, delta, icon: Icon, tone = "default",
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneClasses = {
    default: "bg-primary/5 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  }[tone];
  return (
    <div className="group flex min-h-[124px] flex-col justify-between rounded-lg border bg-card p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums">{value}</div>
          {delta && <div className="mt-2 text-xs text-muted-foreground">{delta}</div>}
        </div>
        {Icon && (
          <div className={cn("rounded-xl p-2.5", toneClasses)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}
