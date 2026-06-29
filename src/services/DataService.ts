import type {
  Company,
  Provider,
  User,
  Transaction,
  ShipmentRequest,
  WarehouseJob,
  ContainerJob,
  CargoHandling,
  Trip,
  DocumentRecord,
  Invoice,
  Payment,
  ComplianceFlag,
  AuditEvent,
  Registration,
  DashboardSeries,
  CompanyInput,
} from "@/types";

/**
 * The single data-access port the UI depends on. Derived from the surface the
 * existing components call on the mock layer. EVERY backend (mockApi,
 * supabaseApi) must implement this exactly so the swap is transparent.
 *
 * Phase-1 canonical entities map to Supabase as:
 *   transactions ↔ shipments, registrations ↔ companies + compliance_documents,
 *   users ↔ profiles, documents ↔ shipment_documents, auditEvents ↔ audit_logs.
 * Out-of-Phase-1 reads (warehouse/container/cargo/trip/invoice/payment/
 * complianceFlag) stay mock-backed until their phase — but remain on the port so
 * the existing UI keeps working under either backend.
 */
export interface DataService {
  // ── Organisations & people ──────────────────────────────────────────────
  listCompanies(): Promise<Company[]>;
  listProviders(): Promise<Provider[]>;
  listUsers(): Promise<User[]>;
  listRegistrations(): Promise<Registration[]>;

  // ── Manual registration verification (admin) ─────────────────────────────
  approveCompany(companyId: string): Promise<void>;
  rejectCompany(companyId: string, reason: string): Promise<void>;
  setCompanyPending(companyId: string, note?: string): Promise<void>;
  updateVerificationChecklist(companyId: string, checklist: Record<string, boolean>): Promise<void>;

  // ── Onboarding write-path (applicant) ────────────────────────────────────
  setRoleIntent(role: "demand" | "source"): Promise<void>;
  saveCompany(input: CompanyInput): Promise<string>;
  recordComplianceDocument(companyId: string, docType: string): Promise<void>;
  capturePopiaConsent(policyVersion: string): Promise<void>;
  submitCompanyForReview(companyId: string): Promise<void>;
  updateOnboardingStep(step: number): Promise<void>;

  // ── Core trade lifecycle (Phase 1) ──────────────────────────────────────
  listTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | null>;
  listShipmentRequests(): Promise<ShipmentRequest[]>;
  listDocuments(): Promise<DocumentRecord[]>;
  listAuditEvents(): Promise<AuditEvent[]>;
  dashboardSeries(): Promise<DashboardSeries>;

  // ── Out-of-Phase-1 (mock-backed until their phase) ──────────────────────
  listWarehouseJobs(): Promise<WarehouseJob[]>;
  listContainerJobs(): Promise<ContainerJob[]>;
  listCargoHandling(): Promise<CargoHandling[]>;
  listTrips(): Promise<Trip[]>;
  listInvoices(): Promise<Invoice[]>;
  listPayments(): Promise<Payment[]>;
  listComplianceFlags(): Promise<ComplianceFlag[]>;
}
