import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { ScrollText, ShieldCheck, FileCheck, Wallet, FileWarning, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const actions = useMemo(
    () => Array.from(new Set((data ?? []).map((e) => e.action))).sort(),
    [data],
  );

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (e) =>
          (action === "all" || e.action === action) &&
          (!search.trim() ||
            e.actor.toLowerCase().includes(search.toLowerCase()) ||
            e.entity.toLowerCase().includes(search.toLowerCase()) ||
            e.action.toLowerCase().includes(search.toLowerCase())),
      ),
    [data, search, action],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof data>();
    filtered.forEach((e) => {
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
  }, [filtered]);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Immutable record of governance, RBAC, and document events."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actor, action or entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-72 pl-9"
            aria-label="Search audit log"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-10 rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by action"
        >
          <option value="all">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

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
