import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useSignOut } from "@/hooks/useSignOut";
import { isDemoLoginsEnabled } from "@/lib/dataBackend";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL: Record<Role, string> = {
  demand: "Demand",
  source: "Source",
  admin: "Admin",
};

const ROLE_STYLE: Record<Role, string> = {
  demand: "bg-info/15 text-info border-info/25",
  source: "bg-ok/15 text-ok border-ok/25",
  admin: "bg-[#6e5bf2]/15 text-[#a89bf8] border-[#6e5bf2]/25",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DemoRolePicker({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="px-1 pb-1">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Demo workspace
      </p>
      <div
        className="flex rounded-lg border bg-inset p-0.5"
        role="tablist"
        aria-label="Switch demo role"
      >
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => onChange(r)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
              role === r
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function UserMenu({ className }: { className?: string }) {
  const { user, role, setRole, isSupabase } = useAuth();
  const signOut = useSignOut();

  if (!user) return null;

  const displayName = user.fullName || user.email;
  const abbr = initials(displayName || "?");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex max-w-[min(100vw-8rem,16rem)] items-center justify-end gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-right outline-none transition",
            "hover:border-border hover:bg-surface-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
            className,
          )}
          aria-label="Account menu"
        >
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="truncate text-sm font-medium leading-tight">{displayName}</div>
            <div className="mt-0.5 flex items-center justify-end gap-1.5">
              {user.companyName && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {user.companyName}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold leading-none",
                  ROLE_STYLE[role],
                )}
              >
                {ROLE_LABEL[role]}
              </span>
            </div>
          </div>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180 sm:block" />
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border/60 transition group-hover:ring-border">
            <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">
              {abbr || "?"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-xl p-0 shadow-lg">
        <div className="border-b px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand">
                {abbr || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                    ROLE_STYLE[role],
                  )}
                >
                  {ROLE_LABEL[role]}
                </span>
              </div>
              {user.companyName && (
                <p className="mt-2 text-xs leading-snug text-muted-foreground">
                  {user.companyName}
                </p>
              )}
            </div>
          </div>
        </div>

        {(isDemoLoginsEnabled() || !isSupabase) && (
          <>
            <div className="py-2">
              <DemoRolePicker role={role} onChange={setRole} />
            </div>
            <DropdownMenuSeparator className="mx-0" />
          </>
        )}

        <div className="p-1">
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-3 py-2.5">
            <Link to="/privacy">
              <ShieldCheck className="h-4 w-4" />
              Data &amp; privacy
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void signOut()}
            className="cursor-pointer rounded-lg px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
