import { supabase } from "@/lib/supabaseClient";
import { buildDashboardSeriesFromTransactions } from "@/lib/dashboardSeries";
import { optimizer, type ScoredQuote } from "@/adapters/optimizer";
import { dbFromLabel, labelFromDb } from "@/lib/documents";
import { signatureProvider } from "@/adapters/signatureProvider";
import { notifier } from "@/adapters/notifier";
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
  DocumentStatus,
  MacroStage,
  GovernanceCheck,
  DataSubjectExport,
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

/* DB doc_type (snake) ↔ UI DocumentType — lossless map lives in @/lib/documents. */
const docType = labelFromDb;

function docStatus(s: string): DocumentStatus {
  if (s === "approved") return "Approved";
  if (s === "verified") return "Verified";
  if (s === "submitted") return "Submitted";
  return "Draft";
}

const DOC_SELECT =
  "id,shipment_id,doc_type,reference,status,version,created_at,payload," +
  "signed_by,signed_at,shipment:shipments(reference),generated_by";

interface DocRow {
  id: string;
  shipment_id: string | null;
  doc_type: string;
  reference: string | null;
  status: string;
  version: number;
  created_at: string;
  payload: Record<string, unknown> | null;
  signed_by: string | null;
  signed_at: string | null;
  shipment: { reference: string } | null;
  generated_by: string | null;
}

function mapDocument(d: DocRow): DocumentRecord {
  return {
    id: d.id,
    type: docType(d.doc_type),
    transactionRef: d.shipment?.reference ?? d.reference ?? "—",
    shipmentId: d.shipment_id ?? undefined,
    uploadedById: d.generated_by ?? "",
    uploadedBy: d.signed_by ?? d.generated_by ?? "—",
    uploadedAt: d.created_at,
    status: docStatus(d.status),
    signed: !!d.signed_by,
    sarsVerified: d.status === "approved",
    version: d.version,
    payload: (d.payload as DocumentRecord["payload"]) ?? undefined,
    signedBy: d.signed_by ?? undefined,
    signedAt: d.signed_at ?? undefined,
  };
}

/* ── Row shapes for the columns we read (no generated DB types) ──────────── */
interface NamedRef {
  id: string;
  name: string;
}
interface QuoteRow {
  id: string;
  source_company_id: string;
  total: number | null;
  freight_cost: number | null;
  customs_cost: number | null;
  warehouse_cost: number | null;
  transport_cost: number | null;
  other_cost: number | null;
  vat_amount: number | null;
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

function quoteTotal(q: QuoteRow): number {
  const total = num(q.total);
  if (total > 0) return total;
  return (
    num(q.freight_cost) +
    num(q.customs_cost) +
    num(q.warehouse_cost) +
    num(q.transport_cost) +
    num(q.other_cost) +
    num(q.vat_amount)
  );
}

function mapQuote(q: QuoteRow): Quote {
  return {
    id: q.id,
    providerId: q.source_company_id,
    providerName: q.src?.name ?? "",
    priceZAR: quoteTotal(q),
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
  "quotes(id,source_company_id,total,freight_cost,customs_cost,warehouse_cost,transport_cost,other_cost,vat_amount,estimated_transit_days,status," +
  "src:companies!quotes_source_company_id_fkey(id,name))";

function fail(ctx: string, error: { message: string } | null) {
  if (error) throw new Error(`[supabaseApi] ${ctx}: ${error.message}`);
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("[supabaseApi] not authenticated");
  return data.user.id;
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
      .update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
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

  async updateVerificationChecklist(
    companyId: string,
    checklist: Record<string, boolean>,
  ): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ verification_checklist: checklist })
      .eq("id", companyId);
    fail("updateVerificationChecklist", error);
  },

  // ── Onboarding write-path ────────────────────────────────────────────────
  async setRoleIntent(role): Promise<void> {
    const id = await currentUserId();
    const { error } = await supabase
      .from("profiles")
      .update({ role: role === "source" ? "source_user" : "demand_user" })
      .eq("id", id);
    fail("setRoleIntent", error);
  },

  async saveCompany(input): Promise<string> {
    const id = await currentUserId();
    const fields = {
      name: input.name,
      type: input.type,
      registration_number: input.registrationNumber ?? null,
      vat_number: input.vatNumber ?? null,
      contact_person: input.contactPerson ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      service_categories: input.subType ? [input.subType] : [],
    };
    const { data: prof } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    const existing = (prof as { company_id: string | null } | null)?.company_id ?? null;
    if (existing) {
      const { error } = await supabase.from("companies").update(fields).eq("id", existing);
      fail("saveCompany(update)", error);
      return existing;
    }
    const { data, error } = await supabase
      .from("companies")
      .insert({ ...fields, approval_status: "pending" })
      .select("id")
      .single();
    fail("saveCompany(insert)", error);
    const companyId = (data as { id: string }).id;
    const { error: linkErr } = await supabase
      .from("profiles")
      .update({ company_id: companyId })
      .eq("id", id);
    fail("saveCompany(link)", linkErr);
    return companyId;
  },

  async recordComplianceDocument(companyId, docType): Promise<void> {
    await supabase
      .from("compliance_documents")
      .delete()
      .eq("company_id", companyId)
      .eq("doc_type", docType);
    const { error } = await supabase
      .from("compliance_documents")
      .insert({ company_id: companyId, doc_type: docType, verification_status: "pending" });
    fail("recordComplianceDocument", error);
  },

  async capturePopiaConsent(policyVersion): Promise<void> {
    const id = await currentUserId();
    const { error } = await supabase.from("popia_consents").insert({
      user_id: id,
      consent_type: "privacy_policy",
      granted: true,
      policy_version: policyVersion,
    });
    fail("capturePopiaConsent", error);
  },

  async submitCompanyForReview(companyId): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ approval_status: "pending" })
      .eq("id", companyId);
    fail("submitCompanyForReview", error);
  },

  async updateOnboardingStep(step): Promise<void> {
    const id = await currentUserId();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_step: step })
      .eq("id", id);
    fail("updateOnboardingStep", error);
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
        "id,shipment_id,doc_type,reference,status,version,created_at,payload," +
          "signed_by,signed_at,shipment:shipments(reference),generated_by",
      )
      .order("created_at", { ascending: false });
    fail("listDocuments", error);
    return ((data ?? []) as unknown as DocRow[]).map(mapDocument);
  },

  async createDocument(input): Promise<DocumentRecord> {
    const userId = await currentUserId();
    let shipmentId = input.shipmentId ?? null;
    if (!shipmentId && input.transactionRef) {
      const { data: s } = await supabase
        .from("shipments")
        .select("id")
        .eq("reference", input.transactionRef)
        .maybeSingle();
      shipmentId = (s as { id: string } | null)?.id ?? null;
    }
    const { data, error } = await supabase
      .from("shipment_documents")
      .insert({
        shipment_id: shipmentId,
        doc_type: dbFromLabel(input.type),
        reference: input.transactionRef,
        status: "draft",
        version: 1,
        payload: input.payload ?? {},
        generated_by: userId,
      })
      .select(DOC_SELECT)
      .single();
    fail("createDocument", error);
    return mapDocument(data as unknown as DocRow);
  },

  async versionDocument(docId, payload): Promise<DocumentRecord> {
    const { data: cur } = await supabase
      .from("shipment_documents")
      .select("version")
      .eq("id", docId)
      .maybeSingle();
    const nextVersion = ((cur as { version: number } | null)?.version ?? 1) + 1;
    const { data, error } = await supabase
      .from("shipment_documents")
      .update({ payload, version: nextVersion, status: "submitted" })
      .eq("id", docId)
      .select(DOC_SELECT)
      .single();
    fail("versionDocument", error);
    return mapDocument(data as unknown as DocRow);
  },

  async signDocument(docId, fullName): Promise<DocumentRecord> {
    const sig = signatureProvider.sign(fullName);
    const { data, error } = await supabase
      .from("shipment_documents")
      .update({ signed_by: sig.signedBy, signed_at: sig.signedAt, status: "verified" })
      .eq("id", docId)
      .select(DOC_SELECT)
      .single();
    fail("signDocument", error);
    return mapDocument(data as unknown as DocRow);
  },

  async approveDocument(docId): Promise<DocumentRecord> {
    const { data, error } = await supabase
      .from("shipment_documents")
      .update({ status: "approved" })
      .eq("id", docId)
      .select(DOC_SELECT)
      .single();
    fail("approveDocument", error);
    return mapDocument(data as unknown as DocRow);
  },

  // ── POPIA data-subject rights (Section I) ────────────────────────────────
  async exportMyData(): Promise<DataSubjectExport> {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    const [transactions, documents, invoices] = await Promise.all([
      supabaseApi.listTransactions(),
      supabaseApi.listDocuments(),
      supabaseApi.listInvoices(),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      subject: u
        ? {
            id: u.id,
            email: u.email ?? "",
            fullName: (u.user_metadata?.full_name as string) ?? "",
            role: (u.user_metadata?.role as string) ?? "",
          }
        : null,
      transactions,
      documents,
      invoices,
    };
  },

  async requestErasure(reason): Promise<void> {
    const userId = await currentUserId();
    await notifier.notify({
      userId: userId ?? undefined,
      title: "POPIA erasure request",
      body: reason,
      kind: "warning",
    });
    // TODO Phase 2: persist to a data_subject_requests table for admin review +
    // execute the RLS-safe cascade erasure once the retention policy is defined.
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

  // ── Shipment & quote write-path (Section F) ──────────────────────────────
  async createShipment(input): Promise<Transaction> {
    const userId = await currentUserId();
    const { data: prof } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    const companyId = (prof as { company_id: string | null } | null)?.company_id;
    if (!companyId) throw new Error("[supabaseApi] no company linked to current user");

    const { data: refData, error: refErr } = await supabase.rpc("next_ref", { p_prefix: "TXN" });
    fail("createShipment(next_ref)", refErr);
    const reference = (refData as string | null) ?? `VTG-TXN-${Date.now()}`;

    const { data, error } = await supabase
      .from("shipments")
      .insert({
        reference,
        demand_company_id: companyId,
        origin_port: input.origin,
        destination_port: input.destination,
        cargo_description: input.cargo,
        weight_kg: Math.round(input.weightTons * 1000),
        cargo_value: input.valueZAR ?? null,
        container_type: input.containerType ?? null,
        status: "submitted",
        current_step: 1,
      })
      .select("id")
      .single();
    fail("createShipment(insert)", error);
    const created = await supabaseApi.getTransaction((data as { id: string }).id);
    if (!created) throw new Error("[supabaseApi] created shipment not found");
    return created;
  },

  async scoreQuotes(shipmentId): Promise<ScoredQuote[]> {
    const tx = await supabaseApi.getTransaction(shipmentId);
    if (!tx) throw new Error(`[supabaseApi] shipment not found: ${shipmentId}`);
    const result = optimizer.score(
      tx.quotes.map((q) => ({
        id: q.id,
        providerId: q.providerId,
        providerName: q.providerName,
        priceZAR: q.priceZAR,
        etaDays: q.etaDays,
      })),
    );
    // Persist scores (best-effort; columns added by the next_ref/scoring migration).
    await Promise.all(
      result.ranked.map((s) =>
        supabase
          .from("quotes")
          .update({
            cost_score: s.costScore,
            service_score: s.serviceScore,
            compliance_score: s.complianceScoreWeighted,
            capacity_score: s.capacityScoreWeighted,
            risk_score: s.riskScoreWeighted,
            total_score: s.totalScore,
          })
          .eq("id", s.id),
      ),
    );
    return result.ranked;
  },

  async selectQuote(shipmentId, quoteId, reason): Promise<void> {
    const tx = await supabaseApi.getTransaction(shipmentId);
    if (!tx) throw new Error(`[supabaseApi] shipment not found: ${shipmentId}`);
    const result = optimizer.score(
      tx.quotes.map((q) => ({
        id: q.id,
        providerId: q.providerId,
        providerName: q.providerName,
        priceZAR: q.priceZAR,
        etaDays: q.etaDays,
      })),
    );
    if (result.recommendedQuoteId && quoteId !== result.recommendedQuoteId && !reason?.trim()) {
      throw new Error("source_override_reason required when overriding the recommended quote");
    }
    const chosen = tx.quotes.find((q) => q.id === quoteId);
    if (!chosen) throw new Error(`[supabaseApi] quote not found: ${quoteId}`);

    const { error: qErr } = await supabase
      .from("quotes")
      .update({ status: "selected" })
      .eq("id", quoteId);
    fail("selectQuote(quote)", qErr);

    const { error: sErr } = await supabase
      .from("shipments")
      .update({
        source_company_id: chosen.providerId,
        current_step: 4,
        status: "in_progress",
        source_override_reason: reason?.trim() || null,
      })
      .eq("id", tx.id);
    fail("selectQuote(shipment)", sErr);
  },

  // ── Analytics: derived from live shipments + quotes (RLS-scoped) ─────────
  async dashboardSeries(): Promise<DashboardSeries> {
    const txs = await supabaseApi.listTransactions();
    return buildDashboardSeriesFromTransactions(txs);
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
