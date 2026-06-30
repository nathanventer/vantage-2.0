import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Vantage" }] }),
  component: UsersPage,
});

const ROLES: User["role"][] = ["Demand", "Source", "Admin"];

function UsersPage() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["users"], queryFn: api.listUsers });
  const users = useMemo(() => usersQ.data ?? [], [usersQ.data]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<User["role"] | "all">("all");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<User["role"]>("Demand");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: User["role"] }) => api.updateUserRole(id, role),
    onSuccess: () => {
      toast.success("Role updated");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const suspendMut = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      api.setUserSuspended(id, suspended),
    onSuccess: () => {
      toast.success("User updated");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const inviteMut = useMutation({
    mutationFn: () => api.inviteUser(inviteEmail.trim(), inviteRole),
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (roleFilter === "all" || u.role === roleFilter) &&
          (!search.trim() ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())),
      ),
    [users, search, roleFilter],
  );

  return (
    <div>
      <PageHeader
        title="User management"
        description="Invite team members, assign roles and suspend access."
      />

      {/* Invite */}
      <div className="mb-5 rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <UserPlus className="h-4 w-4 text-accent" /> Invite a user
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@company.co.za"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as User["role"])}
              className="h-10 rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={!inviteEmail.trim() || inviteMut.isPending}
            onClick={() => inviteMut.mutate()}
          >
            {inviteMut.isPending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-64 pl-9"
            aria-label="Search users"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as User["role"] | "all")}
          className="h-10 rounded-md border border-input bg-inset px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No users match" description="Adjust your search or role filter." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id || u.email} className="h-14">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        roleMut.mutate({
                          id: u.id || u.email,
                          role: e.target.value as User["role"],
                        })
                      }
                      className="h-8 rounded-md border border-input bg-inset px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Role for ${u.name}`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.company}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        suspendMut.mutate({
                          id: u.id || u.email,
                          suspended: u.status !== "Suspended",
                        })
                      }
                    >
                      {u.status === "Suspended" ? "Reinstate" : "Suspend"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
