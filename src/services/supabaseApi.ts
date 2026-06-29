import { supabase } from "@/lib/supabaseClient";
import { mockApi } from "./mockApi";
import type { DataService } from "./DataService";
import type {
  Company,
  Provider,
  User,
  Transaction,
  ShipmentRequest,
  DocumentRecord,
  AuditEvent,
  Registration,
  Quote,
  LifecycleStep,
  DashboardSeries,
  TransactionStatus,
  RequestStatus,
  QuoteStatus,
  RegistrationStatus,
  GovernanceStatus,
  UserStatus,
  DocumentType,
  MacroStage,
  GovernanceCheck,
} from "@/types";

/* ── Canonical lifecycle (blueprint §4.5.2, mirrors shipments.current_step) ── */
const STEP_LABELS = [
  "Demand creates shipment request",
  "System matches suitable source providers",
  "Source providers accept or quote",
  "Demand confirms provider selection",
  "Transaction record created",
  "Service agreement generated",
  "Documentation uploaded",
  "Cargo collection initiated",
  "Port and customs processing",
  "Warehouse operations executed",
  "Transport scheduling initiated",
  "Final delivery completed",
  "Proof of delivery uploaded",
  "Invoice generated",
  "Payment processed",
  "Transaction closed",
];
const MACRO_STAGES: MacroStage[] = [
  "Vessel",
  "Port",
  "Clearing",
  "Transport",
  "Warehouse",
  "Delivery",
];

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/* ── Status mappers: canonical enums → the UI's coarse display unions ─────── */
function txStatus(s: string): TransactionStatus {
  if (["completed", "paid", "archived", "cancelled"].includes(s)) return "Closed";
  if (["in_progress", "invoiced", "disputed"].includes(s)) return "In Progress";
  return "Open"; // draft, submitted, quoted, approved
}
function reqStatus(s: string): RequestStatus {
  if (s === "quoted") return "Quoted";
  if (s === "approved") return "Accepted";
  if (["draft", "submitted"].includes(s)) return "Open";
  return "Confirmed";
}
function quoteStatus(s: string): QuoteStatus {
  return s === "selected" ? "Accepted" : "Quoted";
}
function regStatus(s: string): RegistrationStatus {
  const map: Record<string, RegistrationStatus> = {
    pending: "Pending",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return map[s] ?? "Pending";
}
function govStatus(s: string): GovernanceStatus {
  if (s === "verified" || s === "not_required") return "Verified";
  if (s === "failed") return "Failed";
  return "Pending";
}
function userStatus(s: string): UserStatus {
  if (s === "active") return "Active";
  if (s === "rejected") return "Rejected";
  return "Pending";
}
function uiRole(r: string): User["role"] {
  if (r === "source_user") return "Source";
  if (r === "demand_user" || r === "subscriber") return "Demand";
  return "Admin";
}
function stageFor(step: number): MacroStage {
  return MACRO_STAGES[Math.min(Math.floor((step - 1) / 3), MACRO_STAGES.length - 1)];
}
function buildSteps(currentStep: number): LifecycleStep[] {
  const done = currentStep - 1;
  return STEP_LABELS.map((label, idx) => ({
    index: idx + 1,
    label,
    status: idx < done ? "Completed" : idx === done ? "In Progress" : "Pending",
  }));
}

/* DB doc_type (snake, 19) → UI DocumentType. Unmapped fall back; reconciled in
 * the documents module (STEP 7). shipment_documents is currently empty. */
const DOC_TYPE_MAP: Record<string, DocumentType> = {
  purchase_order: "Purchase Order",
  commercial_invoice: "Commercial Invoice",
  bill_of_lading: "Bill of Lading",
  customs_declaration: "Customs Declaration",
  delivery_note: "Delivery Note",
  warehouse_receipt: "Warehouse Receipt",
  transport_manifest: "Transport Manifest",
  proof_of_service: "Proof of Service Completion",
  proof_of_payment: "Proof of Payment",
  transaction_summary: "Transaction Summary",
  sars_clearing: "SARS Clearing Document",
};
const docType = (t: string): DocumentType => DOC_TYPE_MAP[t] ?? "Transaction Summary";

/* ── Row shapes for the columns we read (no generated DB types) ──────────── */
interface NamedRef {
  id: string;
  name: string;
}
interface QuoteRow {
  id: string;
  source_company_id: string;
  total: number | null;
  estimated_transit_days: number | null;
  status: string;
  src: NamedRef | null;
}
interface ShipmentRow {
  id: string;
  reference: string;
  demand_company_id: string;
  source_company_id: string | null;
  origin_port: string | null;
  destination_port: string | null;
  final_delivery_location: string | null;
  container_type: string | null;
  cargo_description: string | null;
  cargo_value: number | null;
  weight_kg: number | null;
  status: string;
  current_step: number;
  created_at: string;
  demand: NamedRef | null;
  source: NamedRef | null;
  quotes: QuoteRow[] | null;
}

function mapQuote(q: QuoteRow): Quote {
  return {
    id: q.id,
    providerId: q.source_company_id,
    providerName: q.src?.name ?? "",
    priceZAR: num(q.total),
    etaDays: num(q.estimated_transit_days),
    status: quoteStatus(q.status),
  };
}
function mapTransaction(s: ShipmentRow): Transaction {
  return {
    id: s.id,
    reference: s.reference,
    demandCompanyId: s.demand_company_id,
    demandCompany: s.demand?.name ?? "",
    sourceProviderId: s.source_company_id ?? "",
    sourceProvider: s.source?.name ?? "",
    origin: s.origin_port ?? "",
    destination: s.destination_port ?? s.final_delivery_location ?? "",
    containerNo: s.container_type ?? undefined,
    cargo: s.cargo_description ?? "",
    valueZAR: num(s.cargo_value),
    status: txStatus(s.status),
    currentStage: stageFor(s.current_step),
    createdAt: s.created_at,
    steps: buildSteps(s.current_step),
    quotes: (s.quotes ?? []).map(mapQuote),
  };
}

const SHIPMENT_SELECT =
  "id,reference,demand_company_id,source_company_id,origin_port,destination_port," +
  "final_delivery_location,container_type,cargo_description,cargo_value,weight_kg," +
  "status,current_step,created_at," +
  "demand:companies!shipments_demand_company_id_fkey(id,name)," +
  "source:companies!shipments_source_company_id_fkey(id,name)," +
  "quotes(id,source_company_id,total,estimated_transit_days,status," +
  "src:companies!quotes_source_company_id_fkey(id,name))";

function fail(ctx: string, error: { message: string } | null) {
  if (error) throw new Error(`[supabaseApi] ${ctx}: ${error.message}`);
}

/**
 * Live Supabase implementation of the DataService port. Phase-1 entities read
 * from the canonical schema with field mapping to the UI shapes. Out-of-Phase-1
 * lists (warehouse/container/cargo/trip/invoice/payment/complianceFlags) and the
 * analytics series delegate to mockApi until their phase (decision: keep mock).
 */
export const supabaseApi: DataService = {
  async listCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,type")
      .in("type", ["demand", "both"]);
    fail("listCompanies", error);
    return ((data ?? []) as { id: string; name: string }[]).map((c) => ({
      id: c.id,
      name: c.name,
      category: "Demand",
    }));
  },

  async listProviders(): Promise<Provider[]> {
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,type")
      .in("type", ["source", "both"]);
    fail("listProviders", error);
    return ((data ?? []) as { id: string; name: string }[]).map((c) => ({
      id: c.id,
      name: c.name,
      category: "Source",
    }));
  },

  async listUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,email,role,status,company_id,company:companies(name)");
    fail("listUsers", error);
    type Row = {
      id: string;
      full_name: string | null;
      email: string | null;
      role: string;
      status: string;
      company_id: string | null;
      company: { name: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((u) => ({
      id: u.id,
      name: u.full_name ?? u.email ?? "—",
      email: u.email ?? "—",
      role: uiRole(u.role),
      companyId: u.company_id ?? undefined,
      company: u.company?.name ?? "—",
      status: userStatus(u.status),
      lastLogin: "—",
    }));
  },

  async listRegistrations(): Promise<Registration[]> {
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,type,service_categories,contact_person,contact_email,created_at," +
          "approval_status,verification_checklist,rejection_reason," +
          "compliance_documents(doc_type,verification_status)",
      )
      .order("created_at", { ascending: false });
    fail("listRegistrations", error);
    type Row = {
      id: string;
      name: string;
      type: string;
      service_categories: string[] | null;
      contact_person: string | null;
      contact_email: string | null;
      created_at: string;
      approval_status: string;
      verification_checklist: Record<string, boolean> | null;
      rejection_reason: string | null;
      compliance_documents: { doc_type: string; verification_status: string }[] | null;
    };
    return ((data ?? []) as unknown as Row[]).map((c) => {
      const docs = c.compliance_documents ?? [];
      const governance: GovernanceCheck[] = docs.map((d) => ({
        item: d.doc_type.replace(/_/g, " "),
        status: govStatus(d.verification_status),
      }));
      return {
        id: c.id,
        companyId: c.id,
        company: c.name,
        category: c.type === "source" ? "Source" : "Demand",
        subType: c.service_categories?.[0] ?? "General",
        contactName: c.contact_person ?? "—",
        contactEmail: c.contact_email ?? "—",
        submittedAt: c.created_at,
        status: regStatus(c.approval_status),
        governance,
        verificationChecklist: c.verification_checklist ?? {},
        rejectionReason: c.rejection_reason ?? undefined,
        docCount: docs.length,
        docTotal: 8,
      };
    });
  },

  async approveCompany(companyId: string): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ approval_status: "approved", approved_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", companyId);
    fail("approveCompany", error);
  },

  async rejectCompany(companyId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ approval_status: "rejected", rejection_reason: reason })
      .eq("id", companyId);
    fail("rejectCompany", error);
  },

  async setCompanyPending(companyId: string): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ approval_status: "pending" })
      .eq("id", companyId);
    fail("setCompanyPending", error);
  },

  async updateVerificationChecklist(companyId: string, checklist: Record<string, boolean>): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ verification_checklist: checklist })
      .eq("id", companyId);
    fail("updateVerificationChecklist", error);
  },

  async listTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from("shipments")
      .select(SHIPMENT_SELECT)
      .order("created_at", { ascending: false });
    fail("listTransactions", error);
    return ((data ?? []) as unknown as ShipmentRow[]).map(mapTransaction);
  },

  async getTransaction(id: string): Promise<Transaction | null> {
    const column = isUuid(id) ? "id" : "reference";
    const { data, error } = await supabase
      .from("shipments")
      .select(SHIPMENT_SELECT)
      .eq(column, id)
      .maybeSingle();
    fail("getTransaction", error);
    return data ? mapTransaction(data as unknown as ShipmentRow) : null;
  },

  async listShipmentRequests(): Promise<ShipmentRequest[]> {
    const { data, error } = await supabase
      .from("shipments")
      .select(
        "id,demand_company_id,origin_port,destination_port,cargo_description," +
          "weight_kg,created_at,status,demand:companies!shipments_demand_company_id_fkey(name)",
      )
      .order("created_at", { ascending: false });
    fail("listShipmentRequests", error);
    type Row = {
      id: string;
      demand_company_id: string;
      origin_port: string | null;
      destination_port: string | null;
      cargo_description: string | null;
      weight_kg: number | null;
      created_at: string;
      status: string;
      demand: { name: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((s) => ({
      id: s.id,
      demandCompanyId: s.demand_company_id,
      demandCompany: s.demand?.name ?? "",
      origin: s.origin_port ?? "",
      destination: s.destination_port ?? "",
      cargo: s.cargo_description ?? "",
      weightTons: Math.round(num(s.weight_kg) / 1000),
      requestedAt: s.created_at,
      status: reqStatus(s.status),
    }));
  },

  async listDocuments(): Promise<DocumentRecord[]> {
    const { data, error } = await supabase
      .from("shipment_documents")
      .select(
        "id,doc_type,reference,status,version,created_at," +
          "shipment:shipments(reference),generated_by",
      )
      .order("created_at", { ascending: false });
    fail("listDocuments", error);
    type Row = {
      id: string;
      doc_type: string;
      reference: string | null;
      status: string;
      version: number;
      created_at: string;
      shipment: { reference: string } | null;
      generated_by: string | null;
    };
    return ((data ?? []) as unknown as Row[]).map((d) => ({
      id: d.id,
      type: docType(d.doc_type),
      transactionRef: d.shipment?.reference ?? d.reference ?? "—",
      uploadedById: d.generated_by ?? "",
      uploadedBy: d.generated_by ?? "—",
      uploadedAt: d.created_at,
      status: "Draft",
      signed: d.status === "approved",
      sarsVerified: false,
      version: d.version,
    }));
  },

  async listAuditEvents(): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id,actor_id,action,entity,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    fail("listAuditEvents", error);
    type Row = {
      id: number;
      actor_id: string | null;
      action: string;
      entity: string;
      entity_id: string | null;
      created_at: string;
    };
    return ((data ?? []) as unknown as Row[]).map((e) => ({
      id: String(e.id),
      actorId: e.actor_id ?? undefined,
      actor: e.actor_id ?? "system",
      action: e.action,
      entity: e.entity_id ? `${e.entity}:${e.entity_id}` : e.entity,
      timestamp: e.created_at,
    }));
  },

  // ── Analytics + out-of-Phase-1: mock-backed until their phase ────────────
  dashboardSeries(): Promise<DashboardSeries> {
    return mockApi.dashboardSeries();
  },
  listWarehouseJobs() {
    return mockApi.listWarehouseJobs();
  },
  listContainerJobs() {
    return mockApi.listContainerJobs();
  },
  listCargoHandling() {
    return mockApi.listCargoHandling();
  },
  listTrips() {
    return mockApi.listTrips();
  },
  listInvoices() {
    return mockApi.listInvoices();
  },
  listPayments() {
    return mockApi.listPayments();
  },
  listComplianceFlags() {
    return mockApi.listComplianceFlags();
  },
};
