export type Role = "demand" | "source" | "admin";

/** The authenticated user as the UI consumes it (derived from a profile row). */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  companyId?: string;
  companyName?: string;
  /** Whether the user's company has been approved (drives the onboarding gate). */
  companyApproved: boolean;
  /** Persisted 8-step onboarding position so users resume where they left off. */
  onboardingStep: number;
}

/** New shipment / RFQ payload captured on the New Shipment page (Section F). */
export interface NewShipmentInput {
  origin: string;
  destination: string;
  cargo: string;
  weightTons: number;
  containerType?: string;
  valueZAR?: number;
}

/** Company create/update payload captured during onboarding (Step 2). */
export interface CompanyInput {
  name: string;
  type: "demand" | "source";
  registrationNumber?: string;
  vatNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  subType?: string;
}

export type Status = "success" | "pending" | "error" | "info" | "neutral";

/**
 * Broad union of every status label used across the platform. Kept for the
 * StatusBadge component (which renders any label) and a few ad-hoc display
 * casts. Per-domain status types below are narrower and should be preferred on
 * data interfaces so a value from one domain can't be assigned to another.
 */
export type StatusLabel =
  | "Verified"
  | "Pending"
  | "Failed"
  | "In Progress"
  | "Approved"
  | "Rejected"
  | "Under Review"
  | "Active"
  | "Closed"
  | "Draft"
  | "Submitted"
  | "Completed"
  | "Cancelled"
  | "Paid"
  | "Unpaid"
  | "Overdue"
  | "Scheduled"
  | "In Transit"
  | "Delivered"
  | "Quoted"
  | "Accepted"
  | "Confirmed"
  | "Open";

/* ── Per-domain status types ───────────────────────────────────────────── */
export type TransactionStatus = "Open" | "In Progress" | "Closed";
export type RequestStatus = "Open" | "Quoted" | "Accepted" | "Confirmed";
export type QuoteStatus = "Quoted" | "Accepted" | "Rejected";
export type LifecycleStatus = "Completed" | "In Progress" | "Pending";
export type WarehouseStatus = "Open" | "In Progress" | "Completed";
export type ContainerStatus = "Open" | "In Progress" | "Completed";
export type TripStatus = "Scheduled" | "In Transit" | "Delivered";
export type DocumentStatus = "Draft" | "Submitted" | "Verified" | "Approved";
export type InvoiceStatus = "Unpaid" | "Paid" | "Overdue";
export type PaymentStatus = "Verified" | "Pending";
export type ComplianceStatus = "Open" | "Under Review" | "Closed";
export type RegistrationStatus = "Under Review" | "Approved" | "Pending" | "Rejected";
export type GovernanceStatus = "Verified" | "Pending" | "Failed";
export type UserStatus = "Active" | "Pending" | "Rejected" | "Suspended";

/**
 * Granular platform roles (Phase 2 §7). The app gates capabilities by the broad
 * User.role (Demand/Source/Admin); these map onto it for display + DB RLS.
 */
export type PlatformRole =
  | "super_admin"
  | "operations_admin"
  | "finance_admin"
  | "compliance_admin"
  | "demand_user"
  | "source_user"
  | "subscriber";

/* ── Organisation entities (master lists) ──────────────────────────────── */
export type OrgCategory = "Demand" | "Source";

export interface Company {
  id: string;
  name: string;
  category: "Demand";
}

export interface Provider {
  id: string;
  name: string;
  category: "Source";
}

/** Platform user / profile directory entry. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: "Demand" | "Source" | "Admin";
  /** FK into companies/providers; `company` is the denormalized display name. */
  companyId?: string;
  company: string;
  status: UserStatus;
  lastLogin: string;
}

export interface Registration {
  id: string;
  /** FK into companies/providers; `company` is the denormalized display name. */
  companyId: string;
  company: string;
  category: OrgCategory;
  subType: string;
  contactName: string;
  contactEmail: string;
  submittedAt: string;
  status: RegistrationStatus;
  governance: GovernanceCheck[];
  /** Admin manual-verification checklist (item -> confirmed). */
  verificationChecklist?: Record<string, boolean>;
  rejectionReason?: string;
  /** Uploaded compliance docs vs required count (for the completeness badge). */
  docCount?: number;
  docTotal?: number;
}

export interface GovernanceCheck {
  item: string;
  status: GovernanceStatus;
}

export interface Quote {
  id: string;
  /** FK into providers; `providerName` is the denormalized display name. */
  providerId: string;
  providerName: string;
  priceZAR: number;
  etaDays: number;
  status: QuoteStatus;
  /** Present when status is Rejected (mandatory reason, FIX 5). */
  rejectionReason?: string;
  rejectedAt?: string;
}

/** Source-side quote submission (FIX 1/3 — Demand↔Source handoff). */
export interface NewQuoteInput {
  shipmentId: string;
  freightCostZAR: number;
  customsCostZAR: number;
  warehouseCostZAR: number;
  transportCostZAR: number;
  otherCostZAR: number;
  transitDays: number;
  validityDate?: string;
}

export interface LifecycleStep {
  index: number;
  label: string;
  status: LifecycleStatus;
  timestamp?: string;
}

export interface Transaction {
  id: string;
  reference: string;
  /** FK into companies; `demandCompany` is the denormalized display name. */
  demandCompanyId: string;
  demandCompany: string;
  /** FK into providers; `sourceProvider` is the denormalized display name. */
  sourceProviderId: string;
  sourceProvider: string;
  origin: string;
  destination: string;
  vessel?: string;
  containerNo?: string;
  /** Vessel tracking (FIX 8) — drives the VesselFinder link. */
  vesselImo?: string;
  vesselMmsi?: string;
  vesselfinderUrl?: string;
  cargo: string;
  valueZAR: number;
  status: TransactionStatus;
  currentStage: MacroStage;
  createdAt: string;
  steps: LifecycleStep[];
  quotes: Quote[];
}

export type MacroStage = "Vessel" | "Port" | "Clearing" | "Transport" | "Warehouse" | "Delivery";

export interface ShipmentRequest {
  id: string;
  /** FK into companies; `demandCompany` is the denormalized display name. */
  demandCompanyId: string;
  demandCompany: string;
  origin: string;
  destination: string;
  cargo: string;
  weightTons: number;
  requestedAt: string;
  status: RequestStatus;
}

export interface WarehouseJob {
  id: string;
  reference: string;
  warehouseType: "Bonded" | "General" | "Clearing" | "Cross-docking";
  /** FK into companies; `client` is the denormalized display name. */
  clientId: string;
  client: string;
  location: string;
  status: WarehouseStatus;
  checklist: { step: string; done: boolean }[];
  /** Linked shipment reference (live backend). */
  shipmentRef?: string;
  createdAt?: string;
}

export interface ContainerJob {
  id: string;
  containerNo: string;
  type: "Receiving" | "Dispatch" | "Inspection" | "Stuffing" | "Destuffing";
  vessel?: string;
  dwellDays: number;
  damage: boolean;
  status: ContainerStatus;
  /** Linked shipment reference (live backend). */
  shipmentRef?: string;
  createdAt?: string;
}

export interface CargoHandling {
  id: string;
  reference: string;
  operation: "Bulk Handling" | "Palletising" | "Weighbridge" | "Loading" | "Offloading";
  weightKg: number;
  condition: "Good" | "Damaged" | "Pending Inspection";
  timestamp: string;
  /** Linked shipment reference (live backend). */
  shipmentRef?: string;
}

export interface Trip {
  id: string;
  reference: string;
  vehicle: string;
  driver: string;
  origin: string;
  destination: string;
  status: TripStatus;
  progressPct: number;
  podUploaded: boolean;
  lat: number;
  lng: number;
  /** Linked shipment + client (populated on the live backend). */
  shipmentRef?: string;
  cargo?: string;
  clientCompanyId?: string;
  client?: string;
  createdAt?: string;
  etaAt?: string;
}

/** GPS breadcrumb along a trip's route (telemetry history). */
export interface TripWaypoint {
  seq: number;
  lat: number;
  lng: number;
  label?: string;
  recordedAt: string;
}

/** Rich company/client profile for detail views (drawn RLS-scoped). */
export interface CompanyProfile {
  id: string;
  name: string;
  type: "Demand" | "Source";
  registrationNumber?: string;
  vatNumber?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  riskRating?: string;
  approvalStatus: string;
  memberSince: string;
  stats: {
    shipments: number;
    invoicesTotalZAR: number;
    invoicesOutstandingZAR: number;
    complianceDocs: number;
    complianceVerified: number;
  };
}

export type DocumentType =
  | "RFQ"
  | "Source Selection"
  | "Formal Quote"
  | "Purchase Order"
  | "Pro-forma Invoice"
  | "Commercial Invoice"
  | "Tax Invoice"
  | "Packing List"
  | "Import Permit"
  | "Insurance Certificate"
  | "Bill of Lading"
  | "Customs Declaration"
  | "Delivery Note"
  | "Warehouse Receipt"
  | "Transport Manifest"
  | "Proof of Delivery"
  | "SARS Clearing Document"
  | "Proof of Service Completion"
  | "Proof of Payment"
  | "Transaction Summary";

/** Structured document body persisted to shipment_documents.payload (jsonb). */
export interface DocumentPayload {
  counterparty?: string;
  amountZAR?: number;
  issuedDate?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  transactionRef: string;
  /** FK into shipments (when known) for grouping + write-paths. */
  shipmentId?: string;
  /** FK into companies/providers; `uploadedBy` is the denormalized display name. */
  uploadedById: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatus;
  signed: boolean;
  sarsVerified: boolean;
  version: number;
  /** Structured form body (versioned). */
  payload?: DocumentPayload;
  /** E-signature stamp (SignatureProvider). */
  signedBy?: string;
  signedAt?: string;
  signatureToken?: string;
}

/** Create payload for a new document from a template (Section C). */
export interface NewDocumentInput {
  type: DocumentType;
  transactionRef: string;
  shipmentId?: string;
  payload?: DocumentPayload;
}

/** ── Logistics operations execution (Phase 2 §1) ───────────────────────── */
export type ShipmentEventType =
  | "milestone"
  | "step_advanced"
  | "transport_scheduled"
  | "pod_recorded"
  | "warehouse_receipt"
  | "container_update"
  | "gps_ping"
  | "exception";

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  reference: string;
  eventType: ShipmentEventType;
  /** 1–16 lifecycle step this event relates to (when applicable). */
  step?: number;
  note?: string;
  payload?: Record<string, unknown>;
  actor: string;
  createdAt: string;
}

export interface NewOpEventInput {
  shipmentId: string;
  eventType: ShipmentEventType;
  note?: string;
  /** When set, also advance the shipment to this step. */
  step?: number;
  payload?: Record<string, unknown>;
}

export interface ScheduleTransportInput {
  shipmentId: string;
  vehicle: string;
  driver: string;
  etd?: string;
  eta?: string;
}

/** ── Notifications (Phase 2 §8) ─────────────────────────────────────────── */
export type NotificationKind = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  kind: NotificationKind;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export type NotificationEvent =
  | "registration"
  | "quote"
  | "payment"
  | "shipment"
  | "document"
  | "exception";

export type NotificationPreferences = Record<NotificationEvent, { inApp: boolean; email: boolean }>;

/** ── Pulse / Rate & Price Intelligence (Phase 2 §5) ─────────────────────── */
export type TransportMode = "Sea" | "Air" | "Road" | "Rail";

export interface LaneRate {
  id: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  /** YYYY-MM */
  period: string;
  providerName: string;
  priceZAR: number;
  transitDays: number;
}

export interface RateBenchmark {
  lane: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  medianZAR: number;
  lowZAR: number;
  highZAR: number;
  samples: number;
  /** Month-over-month median change, %. */
  momChangePct: number;
}

export type SubscriptionStatus = "none" | "active" | "canceled";
export type PulsePlan = "standard" | "pro";

export interface RateSubscription {
  status: SubscriptionStatus;
  plan?: PulsePlan;
  currentPeriodEnd?: string;
}

export interface PriceAlert {
  id: string;
  lane: string;
  mode: TransportMode;
  thresholdZAR: number;
  direction: "above" | "below";
  createdAt: string;
}

export interface NewPriceAlertInput {
  lane: string;
  mode: TransportMode;
  thresholdZAR: number;
  direction: "above" | "below";
}

/** POPIA data-subject access export (Section I). */
export interface DataSubjectExport {
  generatedAt: string;
  subject: { id: string; email: string; fullName: string; role: string } | null;
  transactions: Transaction[];
  documents: DocumentRecord[];
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  number: string;
  transactionRef: string;
  /** FK into companies; `client` is the denormalized display name. */
  clientId: string;
  client: string;
  /** FK into providers; `provider` is the denormalized display name. */
  providerId: string;
  provider: string;
  amountZAR: number;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  amountZAR: number;
  method: "EFT" | "Card" | "Letter of Credit";
  gatewayStatus: PaymentStatus;
  settledAt?: string;
}

export interface ComplianceFlag {
  id: string;
  /** FK into companies/providers; `entity` is the denormalized display name. */
  entityId: string;
  entity: string;
  area: "SARS" | "Customs" | "Documentation" | "Transport" | "Environmental" | "SOP";
  severity: "Low" | "Medium" | "High";
  status: ComplianceStatus;
  notedAt: string;
}

export interface AuditEvent {
  id: string;
  /** FK into users; `actor` is the denormalized display label. */
  actorId?: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
}

/* ── Dashboard analytics series ─────────────────────────────────────────── */
export interface MonthlySpendPoint {
  month: string;
  spendZAR: number;
  shipments: number;
}

export interface RouteCostPoint {
  route: string;
  costZAR: number;
}

export interface DashboardSeries {
  monthlySpend: MonthlySpendPoint[];
  routeCosts: RouteCostPoint[];
}
