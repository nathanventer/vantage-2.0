import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users — Vantage" }] }),
  component: UsersPage,
});

const USERS = [
  { name: "Jane Pretorius", email: "jane@capeimports.co.za", role: "Demand", company: "Cape Imports (Pty) Ltd", status: "Active",  lastLogin: "Today, 09:14" },
  { name: "Sipho Khumalo",  email: "sipho@maersksa.co.za",  role: "Source", company: "Maersk SA Forwarding",    status: "Active",  lastLogin: "Today, 08:02" },
  { name: "Andile Mahlangu",email: "andile@bidvest.co.za",  role: "Source", company: "Bidvest Panalpina",       status: "Active",  lastLogin: "Yesterday, 16:48" },
  { name: "Thandi Naidoo",  email: "thandi@vantage.co.za",  role: "Admin",  company: "Vantage Compliance",      status: "Active",  lastLogin: "Today, 07:31" },
  { name: "Pieter van der Merwe", email: "pvdm@highveld.co.za", role: "Demand", company: "Highveld Manufacturing", status: "Pending", lastLogin: "—" },
  { name: "Lerato Dlamini", email: "lerato@grindrod.co.za", role: "Source", company: "Grindrod Freight",        status: "Active",  lastLogin: "2 days ago" },
  { name: "Mxolisi Botha",  email: "mxolisi@karoo.co.za",   role: "Demand", company: "Karoo Commodities",       status: "Rejected", lastLogin: "—" },
  { name: "Nokuthula Zulu", email: "nokuthula@unitrans.co.za", role: "Source", company: "Unitrans Africa",     status: "Active",  lastLogin: "5 days ago" },
];

function UsersPage() {
  return (
    <div>
      <PageHeader title="User management" description="Platform user directory across Demand, Source and Admin roles." />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {USERS.map((u) => (
              <TableRow key={u.email} className="h-14">
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell className="text-muted-foreground">{u.company}</TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{u.lastLogin}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
