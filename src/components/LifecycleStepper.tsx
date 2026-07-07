import { Check, Clock, Circle } from "lucide-react";
import type { LifecycleStep } from "@/types";
import { cn } from "@/lib/utils";

export function LifecycleStepper({ steps }: { steps: LifecycleStep[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const done = s.status === "Completed";
        const active = s.status === "In Progress";
        return (
          <li key={s.index} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px",
                  done ? "bg-success" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
                done && "bg-success text-success-foreground",
                active && "bg-warning text-warning-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : active ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "font-medium",
                    done && "text-foreground",
                    active && "text-foreground",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {s.index}. {s.label}
                </p>
                {s.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.timestamp).toLocaleDateString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
