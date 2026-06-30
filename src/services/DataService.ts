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
  NewShipmentInput,
  NewDocumentInput,
  DocumentPayload,
  DataSubjectExport,
  ShipmentEvent,
  NewOpEventInput,
  ScheduleTransportInput,
  LaneRate,
  RateBenchmark,
  RateSubscription,
  PulsePlan,
  PriceAlert,
  NewPriceAlertInput,
} from "@/types";
import type { ScoredQuote } from "@/adapters/optimizer";

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

  // ── Shipment & quote write-path (Section F) ─────────────────────────────
  /** Create a shipment/RFQ; reference generated via next_ref(). */
  createShipment(input: NewShipmentInput): Promise<Transaction>;
  /** Score a shipment's quotes through the Optimizer (25/25/20/15/15). */
  scoreQuotes(shipmentId: string): Promise<ScoredQuote[]>;
  /**
   * Select a provider quote. A non-recommended pick requires a recorded
   * source_override_reason (enforced here AND in the UI).
   */
  selectQuote(shipmentId: string, quoteId: string, reason?: string): Promise<void>;

  // ── Document write-path (Section C → shipment_documents) ────────────────
  createDocument(input: NewDocumentInput): Promise<DocumentRecord>;
  /** Save a new version of a document's structured payload (jsonb). */
  versionDocument(docId: string, payload: DocumentPayload): Promise<DocumentRecord>;
  /** Apply a typed-name e-signature (SignatureProvider). */
  signDocument(docId: string, fullName: string): Promise<DocumentRecord>;
  /** Admin approval / archive. */
  approveDocument(docId: string): Promise<DocumentRecord>;

  // ── Logistics operations execution (Phase 2 §1) ─────────────────────────
  /** Ops event stream for a shipment (timeline), newest first. */
  listShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]>;
  /** Log an operational event; optionally advance the lifecycle step. */
  createOpEvent(input: NewOpEventInput): Promise<ShipmentEvent>;
  /** Advance a shipment to a 1–16 step (writes event + audit, updates stage). */
  advanceShipmentStep(shipmentId: string, toStep: number): Promise<Transaction>;
  /** Schedule transport (vehicle/driver/ETD/ETA) and advance to step 11. */
  scheduleTransport(input: ScheduleTransportInput): Promise<ShipmentEvent>;
  /** Capture POD: upload file to transaction-docs, create a POD doc, advance. */
  recordPOD(shipmentId: string, file: File): Promise<DocumentRecord>;

  // ── Pulse / Rate & Price Intelligence (Phase 2 §5) ──────────────────────
  /** Observed lane rates (origin/destination/mode/period/price). */
  listLaneRates(): Promise<LaneRate[]>;
  /** Market benchmarks aggregated from lane rates (median/range/MoM). */
  listRateBenchmarks(): Promise<RateBenchmark[]>;
  /** The current user's Pulse subscription entitlement. */
  getRateSubscription(): Promise<RateSubscription>;
  /** Begin Pulse checkout. Returns a Stripe URL (edge) or null (mock activates). */
  startPulseCheckout(plan: PulsePlan): Promise<{ url: string | null }>;
  /** The current user's price alerts. */
  listPriceAlerts(): Promise<PriceAlert[]>;
  createPriceAlert(input: NewPriceAlertInput): Promise<PriceAlert>;

  // ── POPIA data-subject rights (Section I → Methodology §4.12.2) ──────────
  /** Access: compile the data subject's accessible records for download. */
  exportMyData(): Promise<DataSubjectExport>;
  /** Erasure: record an erasure request (actual cascade is reviewed by an admin). */
  requestErasure(reason: string): Promise<void>;

  // ── Out-of-Phase-1 (mock-backed until their phase) ──────────────────────
  listWarehouseJobs(): Promise<WarehouseJob[]>;
  listContainerJobs(): Promise<ContainerJob[]>;
  listCargoHandling(): Promise<CargoHandling[]>;
  listTrips(): Promise<Trip[]>;
  listInvoices(): Promise<Invoice[]>;
  listPayments(): Promise<Payment[]>;
  listComplianceFlags(): Promise<ComplianceFlag[]>;
}
