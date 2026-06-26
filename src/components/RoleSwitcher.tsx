import { useRole } from "@/contexts/RoleContext";
import type { Role } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<Role, string> = {
  demand: "Demand — Importer/Exporter",
  source: "Source — Provider",
  admin: "Admin / Compliance",
};

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline">
        Demo: switch role
      </span>
      <Select value={role} onValueChange={(v) => setRole(v as Role)}>
        <SelectTrigger className="h-9 w-[230px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LABELS) as Role[]).map((r) => (
            <SelectItem key={r} value={r}>{LABELS[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
