import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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
  const { role, setRole, user, isSupabase, signOut } = useAuth();

  // Authenticated mode: show the signed-in user + sign out (role is real).
  if (isSupabase) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden text-right sm:block">
          <div className="text-xs font-medium leading-tight">{user?.fullName ?? user?.email}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {LABELS[role]}
            {user?.companyName ? ` · ${user.companyName}` : ""}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Sign out</span>
        </Button>
      </div>
    );
  }

  // Mock/demo mode: local role toggle.
  return (
    <>
      <div className="hidden md:flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Demo role
        </span>
        <div
          role="tablist"
          aria-label="Switch demo role"
          className="inline-flex rounded-full border bg-muted/50 p-0.5"
        >
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

      <div className="md:hidden">
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Switch demo role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LABELS) as Role[]).map((r) => (
              <SelectItem key={r} value={r}>
                {FULL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
