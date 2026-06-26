import { Ship, Anchor, FileCheck, Truck, Warehouse, PackageCheck } from "lucide-react";
import type { MacroStage } from "@/types";
import { cn } from "@/lib/utils";

const STAGES: { key: MacroStage; icon: typeof Ship }[] = [
  { key: "Vessel", icon: Ship },
  { key: "Port", icon: Anchor },
  { key: "Clearing", icon: FileCheck },
  { key: "Transport", icon: Truck },
  { key: "Warehouse", icon: Warehouse },
  { key: "Delivery", icon: PackageCheck },
];

export function MacroJourney({ current }: { current: MacroStage }) {
  const activeIdx = STAGES.findIndex((s) => s.key === current);
  return (
    <div className="rounded-xl border bg-gradient-to-r from-primary to-primary/90 p-5 text-primary-foreground">
      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
        Cargo Journey
      </div>
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    done && "bg-accent text-accent-foreground",
                    active && "bg-accent text-accent-foreground ring-4 ring-accent/30",
                    !done && !active && "bg-primary-foreground/10 text-primary-foreground/60",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn("text-xs font-medium", active ? "text-primary-foreground" : "text-primary-foreground/70")}>
                  {s.key}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn("mx-2 h-px flex-1", done ? "bg-accent" : "bg-primary-foreground/20")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
