import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ScrollText, ShieldCheck, FileCheck, Wallet, FileWarning } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Vantage" }] }),
  component: AuditPage,
});

const ICONS: Record<string, typeof ScrollText> = {
  "Approved registration": ShieldCheck,
  "Rejected document": FileWarning,
  "Verified SARS document": FileCheck,
  "Closed transaction": ScrollText,
  "Generated invoice": Wallet,
  "Flagged compliance issue": FileWarning,
  "Updated RBAC role": ShieldCheck,
};

function AuditPage() {
  const { data, isLoading } = useQuery({ queryKey: ["ae"], queryFn: api.listAuditEvents });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof data>();
    (data ?? []).forEach((e) => {
      const key = new Date(e.timestamp).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr as never);
    });
    return Array.from(map.entries());
  }, [data]);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Immutable record of governance, RBAC, and document events."
      />

      {grouped.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Audit events will appear here as activity happens."
          icon={ScrollText}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, events]) => (
            <section key={day}>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {day}
              </h3>
              <ol className="relative space-y-3 border-l pl-6">
                {(events ?? []).map((e) => {
                  const I = ICONS[e.action] ?? ScrollText;
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[1.85rem] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-accent">
                        <I className="h-3 w-3" />
                      </span>
                      <div className="rounded-lg border bg-card px-4 py-3">
                        <div className="text-sm">
                          <span className="font-medium">{e.actor}</span> · {e.action}{" "}
                          <span className="text-muted-foreground">on</span>{" "}
                          <span className="font-medium tabular-nums">{e.entity}</span>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {new Date(e.timestamp).toLocaleTimeString("en-ZA")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
