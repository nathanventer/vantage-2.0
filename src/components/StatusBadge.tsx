import { cn } from "@/lib/utils";
import type { StatusLabel } from "@/types";

type Tone = "success" | "warning" | "info" | "destructive" | "neutral";

const TONE: Record<string, Tone> = {
  Verified: "success",
  Approved: "success",
  Completed: "success",
  Paid: "success",
  Delivered: "success",
  Confirmed: "success",
  Accepted: "success",
  Active: "success",
  Pending: "warning",
  "Under Review": "warning",
  "In Progress": "warning",
  "In Transit": "warning",
  Submitted: "warning",
  Scheduled: "warning",
  Failed: "destructive",
  Rejected: "destructive",
  Overdue: "destructive",
  Cancelled: "destructive",
  Open: "info",
  Quoted: "info",
  Draft: "info",
  Unpaid: "info",
  Closed: "neutral",
};

const STYLES: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  info: "bg-info/10 text-info ring-info/20",
  destructive: "bg-destructive/10 text-destructive ring-destructive/20",
  neutral: "bg-neutral/10 text-neutral ring-neutral/20",
};

const DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  neutral: "bg-neutral",
};

export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: StatusLabel | string;
  className?: string;
  dot?: boolean;
}) {
  const tone = TONE[status] ?? "neutral";
  return (
    <span
      role="status"
      aria-label={String(status)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        STYLES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />}
      {status}
    </span>
  );
}
