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
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</div>
          {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", toneClasses)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
