export type Role = "demand" | "source" | "admin";

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
export type QuoteStatus = "Quoted" | "Accepted";
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
export type UserStatus = "Active" | "Pending" | "Rejected";

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
}

export interface ContainerJob {
  id: string;
  containerNo: string;
  type: "Receiving" | "Dispatch" | "Inspection" | "Stuffing" | "Destuffing";
  vessel?: string;
  dwellDays: number;
  damage: boolean;
  status: ContainerStatus;
}

export interface CargoHandling {
  id: string;
  reference: string;
  operation: "Bulk Handling" | "Palletising" | "Weighbridge" | "Loading" | "Offloading";
  weightKg: number;
  condition: "Good" | "Damaged" | "Pending Inspection";
  timestamp: string;
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
}

export type DocumentType =
  | "Purchase Order"
  | "Commercial Invoice"
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

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  transactionRef: string;
  /** FK into companies/providers; `uploadedBy` is the denormalized display name. */
  uploadedById: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatus;
  signed: boolean;
  sarsVerified: boolean;
  version: number;
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
