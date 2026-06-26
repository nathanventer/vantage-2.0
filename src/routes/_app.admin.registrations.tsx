import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/registrations")({
  head: () => ({ meta: [{ title: "Registrations — Vantage" }] }),
  component: RegsPage,
});

function RegsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reg"], queryFn: mockApi.listRegistrations });
  return (
    <div>
      <PageHeader title="Registration approvals" description="Review uploaded governance documents and approve or reject applicants." />
      <div className="rounded-xl border bg-card">
        {isLoading ? <Skeleton className="h-72" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sub-type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.company}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-muted-foreground">{r.subType}</TableCell>
                  <TableCell className="text-muted-foreground">{r.contactName}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(r.submittedAt).toLocaleDateString("en-ZA")}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="mr-2" onClick={() => toast.success(`${r.company} approved`)}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.error(`${r.company} rejected`)}>
                      <X className="h-3.5 w-3.5" />
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
