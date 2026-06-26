import { cn } from "@/lib/utils";
import type { StatusLabel } from "@/types";

const MAP: Record<string, string> = {
  Verified: "bg-success/10 text-success ring-success/20",
  Approved: "bg-success/10 text-success ring-success/20",
  Completed: "bg-success/10 text-success ring-success/20",
  Paid: "bg-success/10 text-success ring-success/20",
  Delivered: "bg-success/10 text-success ring-success/20",
  Confirmed: "bg-success/10 text-success ring-success/20",
  Accepted: "bg-success/10 text-success ring-success/20",
  Active: "bg-success/10 text-success ring-success/20",

  Pending: "bg-warning/10 text-warning ring-warning/20",
  "Under Review": "bg-warning/10 text-warning ring-warning/20",
  "In Progress": "bg-warning/10 text-warning ring-warning/20",
  "In Transit": "bg-warning/10 text-warning ring-warning/20",
  Submitted: "bg-warning/10 text-warning ring-warning/20",
  Scheduled: "bg-warning/10 text-warning ring-warning/20",

  Failed: "bg-destructive/10 text-destructive ring-destructive/20",
  Rejected: "bg-destructive/10 text-destructive ring-destructive/20",
  Overdue: "bg-destructive/10 text-destructive ring-destructive/20",
  Cancelled: "bg-destructive/10 text-destructive ring-destructive/20",

  Open: "bg-info/10 text-info ring-info/20",
  Quoted: "bg-info/10 text-info ring-info/20",
  Draft: "bg-info/10 text-info ring-info/20",
  Unpaid: "bg-info/10 text-info ring-info/20",

  Closed: "bg-neutral/10 text-neutral ring-neutral/20",
};

export function StatusBadge({ status, className }: { status: StatusLabel | string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        MAP[status] ?? "bg-neutral/10 text-neutral ring-neutral/20",
        className,
      )}
    >
      {status}
    </span>
  );
}
