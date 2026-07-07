import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusChip } from "@/components/StatusChip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Building2,
  Mail,
  Phone,
  UserRound,
  MapPin,
  ShieldCheck,
  Ship,
  Wallet,
  BadgeCheck,
} from "lucide-react";

/**
 * Client/provider profile: company registration details, contacts and
 * RLS-scoped activity stats. Opened by clicking any company name via
 * <CompanyLink />.
 */
export function CompanyProfileDialog({
  companyId,
  open,
  onOpenChange,
}: {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: p, isLoading } = useQuery({
    queryKey: ["company-profile", companyId],
    queryFn: () => api.getCompanyProfile(companyId!),
    enabled: open && !!companyId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {isLoading || !p ? (
          <div className="space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Building2 className="h-5 w-5 text-brand" />
                {p.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <span>{p.type} platform member</span>
                <StatusChip
                  status={p.approvalStatus === "approved" ? "Approved" : "Under Review"}
                />
              </DialogDescription>
            </DialogHeader>

            {/* Registration & contact */}
            <div className="grid gap-2 rounded-lg border bg-inset/40 p-4 text-sm">
              {p.registrationNumber && (
                <Row icon={BadgeCheck} label="Reg no." value={p.registrationNumber} />
              )}
              {p.vatNumber && <Row icon={ShieldCheck} label="VAT" value={p.vatNumber} />}
              {(p.city || p.country) && (
                <Row
                  icon={MapPin}
                  label="Location"
                  value={[p.city, p.country].filter(Boolean).join(", ")}
                />
              )}
              {p.contactPerson && <Row icon={UserRound} label="Contact" value={p.contactPerson} />}
              {p.contactEmail && <Row icon={Mail} label="Email" value={p.contactEmail} />}
              {p.contactPhone && <Row icon={Phone} label="Phone" value={p.contactPhone} />}
            </div>

            {/* Activity stats */}
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={Ship} label="Shipments" value={String(p.stats.shipments)} />
              <Stat icon={Wallet} label="Invoiced" value={formatZAR(p.stats.invoicesTotalZAR)} />
              <Stat
                icon={Wallet}
                label="Outstanding"
                value={formatZAR(p.stats.invoicesOutstandingZAR)}
                tone={p.stats.invoicesOutstandingZAR > 0 ? "warn" : "ok"}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-inset/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Compliance documents</span>
              <span className="font-medium tabular-nums">
                {p.stats.complianceVerified}/{p.stats.complianceDocs} verified
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Member since{" "}
              {new Date(p.memberSince).toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "long",
              })}
              {p.riskRating ? ` · Risk rating: ${p.riskRating}` : ""}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium" title={value}>
        {value}
      </span>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Ship;
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border bg-inset/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate text-sm font-semibold tabular-nums",
          tone === "warn" && "text-warning",
          tone === "ok" && "text-success",
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Clickable company name — renders as an underline-on-hover link that opens
 * the profile dialog. Drop-in wherever a client/provider name is displayed.
 */
export function CompanyLink({
  companyId,
  name,
  className,
}: {
  companyId?: string;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!companyId) return <span className={className}>{name}</span>;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "cursor-pointer text-left underline-offset-2 transition hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        title={`View ${name} profile`}
      >
        {name}
      </button>
      <CompanyProfileDialog
        companyId={open ? companyId : null}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
