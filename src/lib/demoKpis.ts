import {
  buildDashboardSeriesFromTransactions,
  shipmentCost,
} from "@/lib/dashboardSeries";
import { formatZAR } from "@/lib/format";
import type {
  AuditEvent,
  ComplianceFlag,
  DashboardSeries,
  Invoice,
  Registration,
  Role,
  ShipmentRequest,
  Transaction,
  Trip,
} from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Clock,
  FileWarning,
  Inbox,
  ShieldCheck,
  Ship,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";

export interface DashboardMetricsInput {
  transactions: Transaction[];
  invoices: Invoice[];
  trips: Trip[];
  registrations: Registration[];
  complianceFlags: ComplianceFlag[];
  auditEvents: AuditEvent[];
  shipmentRequests: ShipmentRequest[];
}

export interface DashboardMetrics {
  series: DashboardSeries;
  activeShipments: number;
  inTransit: number;
  pendingApprovals: number;
  spendThisMonthZAR: number;
  spendDeltaPct: number | null;
  incomingRequests: number;
  jobsInProgress: number;
  fleetUtilisationPct: number;
  settlementsDueZAR: number;
  pendingRegistrations: number;
  openComplianceFlags: number;
  auditEvents30d: number;
  platformVolumeZAR: number;
  costByRouteTotalZAR: number;
}

export type KpiTone = "default" | "success" | "warning" | "info";

export interface RoleKpiCard {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
  tone: KpiTone;
}

/** Pick the latest month that has shipment or spend data (avoids empty Dec spike). */
export function latestMonthWithData(series: DashboardSeries["monthlySpend"]) {
  const withData = series.filter((m) => m.shipments > 0 || m.spendZAR > 0);
  return withData.at(-1) ?? series.at(-1);
}

export function computeDashboardMetrics(input: DashboardMetricsInput): DashboardMetrics {
  const series = buildDashboardSeriesFromTransactions(input.transactions);
  const latest = latestMonthWithData(series.monthlySpend);
  const withData = series.monthlySpend.filter((m) => m.shipments > 0 || m.spendZAR > 0);
  const prev = withData.length >= 2 ? withData.at(-2) : undefined;

  const spendThisMonthZAR = latest?.spendZAR ?? 0;
  const spendDeltaPct =
    prev && prev.spendZAR > 0
      ? ((spendThisMonthZAR - prev.spendZAR) / prev.spendZAR) * 100
      : null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const platformVolumeZAR = input.transactions
    .filter((t) => new Date(t.createdAt) >= cutoff)
    .reduce((sum, t) => sum + shipmentCost(t), 0);

  const fleetTotal = input.trips.length;
  const fleetActive = input.trips.filter((t) => t.status === "In Transit").length;

  return {
    series,
    activeShipments: input.transactions.filter((t) => t.status !== "Closed").length,
    inTransit: input.transactions.filter((t) => t.currentStage === "Transport").length,
    pendingApprovals: input.invoices.filter((i) => i.status === "Unpaid").length,
    spendThisMonthZAR,
    spendDeltaPct,
    incomingRequests: input.shipmentRequests.filter((r) => r.status === "Open").length,
    jobsInProgress: input.transactions.filter((t) => t.status === "In Progress").length,
    fleetUtilisationPct: fleetTotal > 0 ? Math.round((fleetActive / fleetTotal) * 100) : 0,
    settlementsDueZAR: input.invoices
      .filter((i) => i.status === "Unpaid" || i.status === "Overdue")
      .reduce((sum, i) => sum + i.amountZAR, 0),
    pendingRegistrations: input.registrations.filter((r) => r.status === "Under Review")
      .length,
    openComplianceFlags: input.complianceFlags.filter((c) => c.status !== "Closed").length,
    auditEvents30d: input.auditEvents.length,
    platformVolumeZAR,
    costByRouteTotalZAR: series.routeCosts.reduce((sum, r) => sum + r.costZAR, 0),
  };
}

function fmtSpendDelta(pct: number | null): string | undefined {
  if (pct == null) return undefined;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% vs prior month`;
}

export function buildRoleKpis(role: Role, m: DashboardMetrics): RoleKpiCard[] {
  if (role === "demand") {
    return [
      { label: "Active shipments", value: m.activeShipments, icon: Ship, tone: "default" },
      { label: "In transit", value: m.inTransit, icon: Truck, tone: "info" },
      { label: "Pending approvals", value: m.pendingApprovals, icon: Clock, tone: "warning" },
      {
        label: "Spend this month",
        value: formatZAR(m.spendThisMonthZAR),
        delta: fmtSpendDelta(m.spendDeltaPct),
        icon: Wallet,
        tone: "success",
      },
    ];
  }
  if (role === "source") {
    return [
      { label: "Incoming requests", value: m.incomingRequests, icon: Inbox, tone: "info" },
      { label: "Jobs in progress", value: m.jobsInProgress, icon: Activity, tone: "warning" },
      {
        label: "Fleet utilisation",
        value: `${m.fleetUtilisationPct}%`,
        delta: "Target 75%",
        icon: Truck,
        tone: "success",
      },
      {
        label: "Settlements due",
        value: formatZAR(m.settlementsDueZAR),
        icon: Wallet,
        tone: "default",
      },
    ];
  }
  return [
    {
      label: "Pending registrations",
      value: m.pendingRegistrations,
      icon: Clock,
      tone: "warning",
    },
    {
      label: "Compliance flags",
      value: m.openComplianceFlags,
      icon: FileWarning,
      tone: "info",
    },
    { label: "Audit events (30d)", value: m.auditEvents30d, icon: ShieldCheck, tone: "default" },
    {
      label: "Platform volume",
      value: formatZAR(m.platformVolumeZAR),
      delta: "Last 30 days",
      icon: TrendingUp,
      tone: "success",
    },
  ];
}
