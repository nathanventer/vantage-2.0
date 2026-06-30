import { Check, Clock, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export type GovernanceItem = {
  item: string;
  status: "Verified" | "Pending" | "Failed" | "Under Review";
  optional?: boolean;
  note?: string;
};

const DEFAULT_ITEMS: GovernanceItem[] = [
  { item: "Company registration (CIPC)", status: "Verified" },
  { item: "Tax clearance", status: "Verified" },
  { item: "Banking confirmation", status: "Verified" },
  { item: "Director ID", status: "Verified" },
  { item: "SARS registration", status: "Pending" },
  { item: "Insurance certificate", status: "Verified" },
  { item: "Operating licence", status: "Verified" },
  { item: "B-BBEE certificate", status: "Pending", optional: true, note: "Where applicable" },
];

export function GovernancePanel({
  items = DEFAULT_ITEMS,
  title = "Governance & compliance verification",
  description = "All eight checks must be Verified before a company is approved. B-BBEE is conditional.",
}: {
  items?: GovernanceItem[];
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {items.map((g) => {
          const Icon =
            g.status === "Verified"
              ? Check
              : g.status === "Failed"
                ? X
                : g.status === "Under Review"
                  ? AlertCircle
                  : Clock;
          const iconTone =
            g.status === "Verified"
              ? "bg-success/10 text-success"
              : g.status === "Failed"
                ? "bg-destructive/10 text-destructive"
                : g.status === "Under Review"
                  ? "bg-info/10 text-info"
                  : "bg-warning/10 text-warning";
          return (
            <li
              key={g.item}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    iconTone,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{g.item}</div>
                  {(g.optional || g.note) && (
                    <div className="text-[11px] text-muted-foreground">
                      {g.optional ? "Optional · " : ""}
                      {g.note}
                    </div>
                  )}
                </div>
              </div>
              <StatusBadge status={g.status} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
