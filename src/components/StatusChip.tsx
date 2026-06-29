import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "err" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok border-ok-bd",
  warn: "bg-warn-bg text-warn border-warn-bd",
  err: "bg-err-bg text-err border-err-bd",
  info: "bg-info-bg text-info border-info-bd",
  neutral: "bg-neutral-bg text-neutral border-neutral-bd",
};
const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  err: "bg-err",
  info: "bg-info",
  neutral: "bg-neutral",
};

/**
 * Canonical 11 shipment statuses (keyed normalised, spaces) plus the UI's
 * display aliases so the chip works on both the DB enum and mock labels.
 */
const MAP: Record<string, { tone: Tone; dot?: string; className?: string }> = {
  // canonical shipment_status (11)
  draft: { tone: "neutral" },
  submitted: { tone: "info" },
  quoted: { tone: "warn" },
  approved: { tone: "ok" },
  "in progress": { tone: "info", dot: "bg-brand" },
  completed: { tone: "ok" },
  invoiced: { tone: "info" },
  paid: { tone: "ok", className: "font-semibold" },
  cancelled: { tone: "neutral", className: "opacity-80" },
  disputed: { tone: "err" },
  archived: { tone: "neutral", className: "opacity-60" },
  // UI / domain aliases
  open: { tone: "info" },
  closed: { tone: "neutral" },
  "in transit": { tone: "info", dot: "bg-brand" },
  delivered: { tone: "ok" },
  scheduled: { tone: "warn" },
  pending: { tone: "warn" },
  "under review": { tone: "warn" },
  rejected: { tone: "err" },
  verified: { tone: "ok" },
  failed: { tone: "err" },
  active: { tone: "ok" },
  unpaid: { tone: "info" },
  overdue: { tone: "err" },
  accepted: { tone: "ok" },
  confirmed: { tone: "ok" },
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const key = status.trim().toLowerCase().replace(/[_-]+/g, " ");
  const m = MAP[key] ?? { tone: "neutral" as Tone };
  return (
    <span
      role="status"
      aria-label={status}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
        TONE[m.tone],
        m.className,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", m.dot ?? DOT[m.tone])} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
