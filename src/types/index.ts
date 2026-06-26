export type Role = "demand" | "source" | "admin";

export type Status =
  | "success"
  | "pending"
  | "error"
  | "info"
  | "neutral";

export type StatusLabel =
  | "Verified" | "Pending" | "Failed" | "In Progress" | "Approved" | "Rejected"
  | "Under Review" | "Active" | "Closed" | "Draft" | "Submitted" | "Completed"
  | "Cancelled" | "Paid" | "Unpaid" | "Overdue" | "Scheduled" | "In Transit"
  | "Delivered" | "Quoted" | "Accepted" | "Confirmed" | "Open";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company: string;
  subRole?: string;
}

export interface Registration {
  id: string;
  company: string;
  category: "Demand" | "Source";
  subType: string;
  contactName: string;
  contactEmail: string;
  submittedAt: string;
  status: StatusLabel;
  governance: GovernanceCheck[];
}

export interface GovernanceCheck {
  item: string;
  status: StatusLabel;
}

export interface Quote {
  id: string;
  providerId: string;
  providerName: string;
  priceZAR: number;
  etaDays: number;
  status: StatusLabel;
}

export interface LifecycleStep {
  index: number;
  label: string;
  status: StatusLabel;
  timestamp?: string;
}

export interface Transaction {
  id: string;
  reference: string;
  demandCompany: string;
  sourceProvider: string;
  origin: string;
  destination: string;
  vessel?: string;
  containerNo?: string;
  cargo: string;
  valueZAR: number;
  status: StatusLabel;
  currentStage: MacroStage;
  createdAt: string;
  steps: LifecycleStep[];
  quotes: Quote[];
}

export type MacroStage =
  | "Vessel" | "Port" | "Clearing" | "Transport" | "Warehouse" | "Delivery";

export interface ShipmentRequest {
  id: string;
  demandCompany: string;
  origin: string;
  destination: string;
  cargo: string;
  weightTons: number;
  requestedAt: string;
  status: StatusLabel;
}

export interface WarehouseJob {
  id: string;
  reference: string;
  warehouseType: "Bonded" | "General" | "Clearing" | "Cross-docking";
  client: string;
  location: string;
  status: StatusLabel;
  checklist: { step: string; done: boolean }[];
}

export interface ContainerJob {
  id: string;
  containerNo: string;
  type: "Receiving" | "Dispatch" | "Inspection" | "Stuffing" | "Destuffing";
  vessel?: string;
  dwellDays: number;
  damage: boolean;
  status: StatusLabel;
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
  status: StatusLabel;
  progressPct: number;
  podUploaded: boolean;
  lat: number;
  lng: number;
}

export type DocumentType =
  | "Purchase Order" | "Commercial Invoice" | "Bill of Lading"
  | "Customs Declaration" | "Delivery Note" | "Warehouse Receipt"
  | "Transport Manifest" | "Proof of Delivery" | "SARS Clearing Document"
  | "Proof of Service Completion" | "Proof of Payment" | "Transaction Summary";

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  transactionRef: string;
  uploadedBy: string;
  uploadedAt: string;
  status: StatusLabel;
  signed: boolean;
  sarsVerified: boolean;
  version: number;
}

export interface Invoice {
  id: string;
  number: string;
  transactionRef: string;
  client: string;
  provider: string;
  amountZAR: number;
  issuedAt: string;
  dueAt: string;
  status: StatusLabel;
}

export interface Payment {
  id: string;
  invoiceNumber: string;
  amountZAR: number;
  method: "EFT" | "Card" | "Letter of Credit";
  gatewayStatus: StatusLabel;
  settledAt?: string;
}

export interface ComplianceFlag {
  id: string;
  entity: string;
  area: "SARS" | "Customs" | "Documentation" | "Transport" | "Environmental" | "SOP";
  severity: "Low" | "Medium" | "High";
  status: StatusLabel;
  notedAt: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
}
