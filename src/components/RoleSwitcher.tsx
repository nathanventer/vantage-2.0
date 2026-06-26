import { useRole } from "@/contexts/RoleContext";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<Role, string> = {
  demand: "Demand",
  source: "Source",
  admin: "Admin",
};

const FULL: Record<Role, string> = {
  demand: "Demand — Importer / Exporter",
  source: "Source — Provider",
  admin: "Admin / Compliance",
};

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  return (
    <>
      {/* Segmented control — desktop */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Demo role</span>
        <div role="tablist" aria-label="Switch demo role" className="inline-flex rounded-full border bg-muted/50 p-0.5">
          {(Object.keys(LABELS) as Role[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                role === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Compact dropdown — mobile */}
      <div className="md:hidden">
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Switch demo role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LABELS) as Role[]).map((r) => (
              <SelectItem key={r} value={r}>{FULL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
