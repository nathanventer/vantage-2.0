import { supabase } from "@/lib/supabaseClient";
import { buildDashboardSeriesFromTransactions } from "@/lib/dashboardSeries";
import { computeDashboardMetrics } from "@/lib/demoKpis";
import { buildRateBenchmarks } from "@/lib/pulse";
import { formatReference } from "@/lib/references";
import {
  COMPLIANCE_BUCKET,
  complianceDocPath,
  podDocPath,
  TRANSACTION_BUCKET,
} from "@/lib/storagePaths";
import {
  dbRole,
  docStatus,
  govStatus,
  quoteStatus,
  regStatus,
  reqStatus,
  txStatus,
  uiRole,
  userStatus,
} from "@/lib/statusMappers";
import { EDGE_LIVE, invokeEdge } from "@/lib/edge";
import { optimizer, type ScoredQuote } from "@/adapters/optimizer";
import { dbFromLabel, labelFromDb } from "@/lib/documents";
import { signatureProvider } from "@/adapters/signatureProvider";
import { notifier } from "@/adapters/notifier";
import type { DataService } from "./DataService";
import type { Database, Json } from "@/types/supabase";

type ComplianceDocType = Database["public"]["Enums"]["compliance_doc_type"];
type DbUserRole = Database["public"]["Enums"]["user_role"];

const COMPLIANCE_DOC_TYPES: readonly ComplianceDocType[] = [
  "company_registration",
  "tax_clearance",
  "vat_certificate",
  "bank_confirmation",
  "director_id",
  "sars_registration",
  "insurance",
  "operating_license",
  "bbbee_certificate",
  "other",
] as const;

/** Coerce an arbitrary doc-type string onto the DB enum (unknown → "other"). */
function complianceDocType(docType: string): ComplianceDocType {
  return (COMPLIANCE_DOC_TYPES as readonly string[]).includes(docType)
    ? (docType as ComplianceDocType)
    : "other";
}
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
  MacroStage,
  GovernanceCheck,
  DataSubjectExport,
  ShipmentEvent,
  LaneRate,
  RateBenchmark,
  RateSubscription,
  PriceAlert,
  NotificationItem,
  NotificationPreferences,
  WarehouseJob,
  ContainerJob,
  CargoHandling,
  Trip,
  TripWaypoint,
  CompanyProfile,
  Invoice,
  Payment,
  ComplianceFlag,
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

const asJson = (v: unknown): Json => v as Json;
const LIST_LIMIT = 250;

/* ── Status mappers live in @/lib/statusMappers (unit-tested) ─────────────── */
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

const DOC_SELECT =
  "id,shipment_id,doc_type,reference,status,version,created_at,payload," +
  "signed_by,signed_at,signature_token,shipment:shipments(reference),generated_by";

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
  signature_token: string | null;
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
    // The doc_status enum has no "signed" value — a signed document stays
    // `submitted` in the DB until approval, and reads as Verified in the UI.
    status: d.signed_by && d.status !== "approved" ? "Verified" : docStatus(d.status),
    signed: !!d.signed_by,
    sarsVerified: d.status === "approved",
    version: d.version,
    payload: (d.payload as DocumentRecord["payload"]) ?? undefined,
    signedBy: d.signed_by ?? undefined,
    signedAt: d.signed_at ?? undefined,
    signatureToken: d.signature_token ?? undefined,
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
  rejection_reason: string | null;
  rejected_at: string | null;
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
  vessel_name: string | null;
  vessel_imo: string | null;
  vessel_mmsi: string | null;
  vesselfinder_url: string | null;
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
    rejectionReason: q.rejection_reason ?? undefined,
    rejectedAt: q.rejected_at ?? undefined,
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
    vessel: s.vessel_name ?? undefined,
    vesselImo: s.vessel_imo ?? undefined,
    vesselMmsi: s.vessel_mmsi ?? undefined,
    vesselfinderUrl: s.vesselfinder_url ?? undefined,
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
  "final_delivery_location,container_type,vessel_name,vessel_imo,vessel_mmsi,vesselfinder_url," +
  "cargo_description,cargo_value,weight_kg," +
  "status,current_step,created_at," +
  "demand:companies!shipments_demand_company_id_fkey(id,name)," +
  "source:companies!shipments_source_company_id_fkey(id,name)," +
  "quotes(id,source_company_id,total,freight_cost,customs_cost,warehouse_cost,transport_cost,other_cost,vat_amount,estimated_transit_days,status,rejection_reason,rejected_at," +
  "src:companies!quotes_source_company_id_fkey(id,name))";

function fail(ctx: string, error: { message: string } | null) {
  if (error) throw new Error(`[supabaseApi] ${ctx}: ${error.message}`);
}

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  registration: { inApp: true, email: true },
  quote: { inApp: true, email: true },
  payment: { inApp: true, email: true },
  shipment: { inApp: true, email: false },
  document: { inApp: true, email: false },
  exception: { inApp: true, email: true },
};

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("[supabaseApi] not authenticated");
  return data.user.id;
}

/** Demand-side company for shipment writes — RLS-aligned via my_company(). */
async function resolveDemandCompanyId(): Promise<string> {
  const { data: own, error: mcErr } = await supabase.rpc("my_company");
  fail("resolveDemandCompanyId(my_company)", mcErr);
  if (own) return own as string;

  const { data: adminFlag, error: adminErr } = await supabase.rpc("is_admin");
  fail("resolveDemandCompanyId(is_admin)", adminErr);
  if (adminFlag) {
    const { data: row, error } = await supabase
      .from("companies")
      .select("id")
      .in("type", ["demand", "both"])
      .eq("approval_status", "approved")
      .order("name")
      .limit(1)
      .maybeSingle();
    fail("resolveDemandCompanyId(admin demand co)", error);
    if (row?.id) return row.id;
  }

  throw new Error(
    "[supabaseApi] no company linked to current user — complete registration before creating shipments",
  );
}

/** Mint a reference or fall back when next_ref RPC is not yet deployed. */
async function mintRef(prefix: "TXN" | "QTE"): Promise<string> {
  const { data, error } = await supabase.rpc("next_ref", { p_prefix: prefix });
  if (error || data == null) return `VTG-${prefix}-${Date.now()}`;
  return data as string;
}

/** Match providers via RPC, or client-side insert when RPC is unavailable. */
async function matchProviders(shipmentId: string): Promise<void> {
  const { data: rpcCount, error: rpcErr } = await supabase.rpc("match_providers_for_shipment", {
    p_shipment_id: shipmentId,
  });

  const { count, error: countErr } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("shipment_id", shipmentId);
  fail("matchProviders(count)", countErr);

  if (!rpcErr && (count ?? 0) >= 3) return;

  const { data: providerRows, error: provErr } = await supabase
    .from("companies")
    .select("id,name")
    .in("type", ["source", "both"])
    .order("name")
    .limit(4);
  fail("matchProviders(providers)", provErr);
  const providers = (providerRows ?? []) as { id: string; name: string }[];
  if (providers.length === 0) fail("matchProviders(rpc)", rpcErr);

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const { data: existing } = await supabase
      .from("quotes")
      .select("id")
      .eq("shipment_id", shipmentId)
      .eq("source_company_id", p.id)
      .maybeSingle();
    if (existing) continue;

    const freight = 120_000 + i * 18_500 + (Date.now() % 7) * 2_100;
    const customs = Math.round(freight * 0.12 * 100) / 100;
    const warehouse = Math.round(freight * 0.15 * 100) / 100;
    const transport = Math.round(freight * 0.18 * 100) / 100;
    const vat = Math.round((freight + customs + warehouse + transport) * 0.15 * 100) / 100;
    const reference = await mintRef("QTE");
    const { error: insErr } = await supabase.from("quotes").insert({
      reference,
      shipment_id: shipmentId,
      source_company_id: p.id,
      freight_cost: freight,
      customs_cost: customs,
      warehouse_cost: warehouse,
      transport_cost: transport,
      other_cost: 0,
      vat_amount: vat,
      estimated_transit_days: 6 + i + 1,
      status: "submitted",
    });
    fail("matchProviders(insert)", insErr);
  }

  const { error: stepErr } = await supabase
    .from("shipments")
    .update({ current_step: 2 })
    .eq("id", shipmentId);
  fail("matchProviders(step)", stepErr);

  void rpcCount;
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
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
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

  async recordComplianceDocument(companyId, docType, file): Promise<void> {
    const path = complianceDocPath(companyId, docType, file.name);
    const { error: upErr } = await supabase.storage
      .from(COMPLIANCE_BUCKET)
      .upload(path, file, { upsert: true });
    fail("recordComplianceDocument(upload)", upErr);

    await supabase
      .from("compliance_documents")
      .delete()
      .eq("company_id", companyId)
      .eq("doc_type", complianceDocType(docType));
    const { error } = await supabase.from("compliance_documents").insert({
      company_id: companyId,
      doc_type: complianceDocType(docType),
      verification_status: "pending",
      file_path: path,
    });
    fail("recordComplianceDocument", error);
  },

  async getSignedStorageUrl(bucket, path): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    fail("getSignedStorageUrl", error);
    if (!data?.signedUrl) throw new Error("[supabaseApi] signed URL unavailable");
    return data.signedUrl;
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
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
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
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
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
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
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
    if (!shipmentId) {
      throw new Error(
        `[supabaseApi] createDocument: no shipment found for reference ${input.transactionRef}`,
      );
    }
    const { data, error } = await supabase
      .from("shipment_documents")
      .insert({
        shipment_id: shipmentId,
        doc_type: dbFromLabel(input.type),
        reference: input.transactionRef,
        status: "draft",
        version: 1,
        payload: asJson(input.payload ?? {}),
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
      .update({ payload: asJson(payload), version: nextVersion, status: "submitted" })
      .eq("id", docId)
      .select(DOC_SELECT)
      .single();
    fail("versionDocument", error);
    return mapDocument(data as unknown as DocRow);
  },

  async signDocument(docId, fullName): Promise<DocumentRecord> {
    if (EDGE_LIVE) {
      // Server-side stamp: sign-doc writes signed_by/at + signature_token and
      // the audit row via service role, so the stamp can't be forged client-side.
      await invokeEdge("sign-doc", { documentId: docId, fullName });
      const { data, error } = await supabase
        .from("shipment_documents")
        .select(DOC_SELECT)
        .eq("id", docId)
        .single();
      fail("signDocument", error);
      return mapDocument(data as unknown as DocRow);
    }
    const sig = signatureProvider.sign(fullName);
    // doc_status enum: draft|generated|uploaded|submitted|approved|rejected|archived.
    // Signing promotes to `submitted`; the signature fields carry the signed state.
    const { data, error } = await supabase
      .from("shipment_documents")
      .update({
        signed_by: sig.signedBy,
        signed_at: sig.signedAt,
        signature_token: sig.token,
        status: "submitted",
      })
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
    const { error } = await supabase.from("data_subject_requests").insert({
      user_id: userId,
      request_type: "erasure",
      reason,
      status: "pending",
    });
    fail("requestErasure", error);
    await notifier.notify({
      userId,
      title: "POPIA erasure request",
      body: reason,
      kind: "warning",
    });
  },

  async listAuditEvents(): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id,actor_id,action,entity,entity_id,created_at")
      // Newest first; id as a stable tiebreaker for same-timestamp entries.
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
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
    const companyId = await resolveDemandCompanyId();

    const { data: refData, error: refErr } = await supabase.rpc("next_ref", { p_prefix: "TXN" });
    const reference = refErr || refData == null ? await mintRef("TXN") : (refData as string);

    const { data, error } = await supabase
      .from("shipments")
      .insert({
        reference,
        demand_company_id: companyId,
        created_by: userId,
        shipment_type: "Import Container",
        currency: "ZAR",
        origin_port: input.origin,
        destination_port: input.destination,
        cargo_description: input.cargo,
        weight_kg: Math.round(input.weightTons * 1000),
        cargo_value: input.valueZAR ?? null,
        container_type: input.containerType ?? null,
        status: "draft",
        current_step: 1,
      })
      .select("id")
      .single();
    fail("createShipment(insert)", error);

    const shipmentId = (data as { id: string }).id;
    await matchProviders(shipmentId);

    const created = await supabaseApi.getTransaction(shipmentId);
    if (!created) throw new Error("[supabaseApi] created shipment not found");
    return created;
  },

  async scoreQuotes(shipmentId): Promise<ScoredQuote[]> {
    let tx = await supabaseApi.getTransaction(shipmentId);
    if (!tx) throw new Error(`[supabaseApi] shipment not found: ${shipmentId}`);

    if (tx.quotes.length === 0) {
      await matchProviders(shipmentId);
      tx = (await supabaseApi.getTransaction(shipmentId)) ?? tx;
    }

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

    const { error: selErr } = await supabase.rpc("select_shipment_quote", {
      p_shipment_id: tx.id,
      p_quote_id: quoteId,
      p_override_reason: reason?.trim() || undefined,
    });
    if (selErr) {
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
    }
  },

  async submitQuote(input): Promise<Quote> {
    const userId = await currentUserId();
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    fail("submitQuote(profile)", pErr);
    const companyId = (prof as { company_id: string | null }).company_id;
    if (!companyId) throw new Error("[supabaseApi] submitQuote: user has no company");

    const { data: ref, error: refErr } = await supabase.rpc("next_ref", { p_prefix: "QTE" });
    fail("submitQuote(next_ref)", refErr);

    const subtotal =
      num(input.freightCostZAR) +
      num(input.customsCostZAR) +
      num(input.warehouseCostZAR) +
      num(input.transportCostZAR) +
      num(input.otherCostZAR);
    const vat = Math.round(subtotal * 0.15 * 100) / 100;

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        reference: ref as unknown as string,
        shipment_id: input.shipmentId,
        source_company_id: companyId,
        freight_cost: num(input.freightCostZAR),
        customs_cost: num(input.customsCostZAR),
        warehouse_cost: num(input.warehouseCostZAR),
        transport_cost: num(input.transportCostZAR),
        other_cost: num(input.otherCostZAR),
        vat_amount: vat,
        // `total` is a generated column (sum of the cost fields) — never insert it.
        estimated_transit_days: num(input.transitDays),
        validity_date: input.validityDate ?? null,
        status: "submitted",
      })
      .select(
        "id,source_company_id,total,freight_cost,customs_cost,warehouse_cost,transport_cost,other_cost,vat_amount,estimated_transit_days,status,rejection_reason,rejected_at," +
          "src:companies!quotes_source_company_id_fkey(id,name)",
      )
      .single();
    fail("submitQuote", error);
    return mapQuote(data as unknown as QuoteRow);
  },

  async rejectQuote(shipmentId, quoteId, reason): Promise<void> {
    const clean = reason.trim();
    if (clean.length < 3) {
      throw new Error("A rejection reason of at least 3 characters is required.");
    }
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("quotes")
      .update({
        status: "rejected",
        rejection_reason: clean,
        rejected_at: new Date().toISOString(),
        rejected_by: userId,
      })
      .eq("id", quoteId)
      .eq("shipment_id", shipmentId)
      .select("id")
      .maybeSingle();
    fail("rejectQuote", error);
    if (!data) throw new Error("[supabaseApi] rejectQuote: quote not found or not permitted");
  },

  // ── Logistics operations execution (Phase 2 §1) ─────────────────────────
  async listShipmentEvents(shipmentId): Promise<ShipmentEvent[]> {
    const { data, error } = await supabase
      .from("shipment_events")
      .select(
        "id,shipment_id,event_type,step,note,payload,created_by,created_at,shipment:shipments(reference)",
      )
      .eq("shipment_id", shipmentId)
      // Newest first; id as a stable tiebreaker for same-timestamp events.
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(LIST_LIMIT);
    fail("listShipmentEvents", error);
    type Row = {
      id: string;
      shipment_id: string;
      event_type: string;
      step: number | null;
      note: string | null;
      payload: Record<string, unknown> | null;
      created_by: string | null;
      created_at: string;
      shipment: { reference: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((e) => ({
      id: e.id,
      shipmentId: e.shipment_id,
      reference: e.shipment?.reference ?? "",
      eventType: e.event_type as ShipmentEvent["eventType"],
      step: e.step ?? undefined,
      note: e.note ?? undefined,
      payload: e.payload ?? undefined,
      actor: e.created_by ?? "system",
      createdAt: e.created_at,
    }));
  },

  async createOpEvent(input): Promise<ShipmentEvent> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("shipment_events")
      .insert({
        shipment_id: input.shipmentId,
        event_type: input.eventType,
        step: input.step ?? null,
        note: input.note ?? null,
        payload: asJson(input.payload ?? null),
        created_by: userId,
      })
      .select(
        "id,shipment_id,event_type,step,note,payload,created_by,created_at,shipment:shipments(reference)",
      )
      .single();
    fail("createOpEvent", error);
    if (typeof input.step === "number") {
      await supabase
        .from("shipments")
        .update({
          current_step: input.step,
          status: input.step >= 16 ? "completed" : "in_progress",
        })
        .eq("id", input.shipmentId);
    }
    const e = data as unknown as {
      id: string;
      shipment_id: string;
      event_type: string;
      step: number | null;
      note: string | null;
      payload: Record<string, unknown> | null;
      created_by: string | null;
      created_at: string;
      shipment: { reference: string } | null;
    };
    return {
      id: e.id,
      shipmentId: e.shipment_id,
      reference: e.shipment?.reference ?? "",
      eventType: e.event_type as ShipmentEvent["eventType"],
      step: e.step ?? undefined,
      note: e.note ?? undefined,
      payload: e.payload ?? undefined,
      actor: e.created_by ?? "system",
      createdAt: e.created_at,
    };
  },

  async advanceShipmentStep(shipmentId, toStep): Promise<Transaction> {
    await supabaseApi.createOpEvent({
      shipmentId,
      eventType: "step_advanced",
      step: toStep,
      note: `Advanced to step ${toStep}`,
    });
    const tx = await supabaseApi.getTransaction(shipmentId);
    if (!tx) throw new Error(`[supabaseApi] shipment not found: ${shipmentId}`);
    return tx;
  },

  async scheduleTransport(input): Promise<ShipmentEvent> {
    return supabaseApi.createOpEvent({
      shipmentId: input.shipmentId,
      eventType: "transport_scheduled",
      step: 11,
      note: `Transport scheduled · ${input.vehicle} · ${input.driver}`,
      payload: { vehicle: input.vehicle, driver: input.driver, etd: input.etd, eta: input.eta },
    });
  },

  async recordPOD(shipmentId, file): Promise<DocumentRecord> {
    const userId = await currentUserId();
    const tx = await supabaseApi.getTransaction(shipmentId);
    if (!tx) throw new Error(`[supabaseApi] shipment not found: ${shipmentId}`);
    const path = podDocPath(tx.demandCompanyId, tx.reference, file.name);
    const { error: upErr } = await supabase.storage
      .from(TRANSACTION_BUCKET)
      .upload(path, file, { upsert: true });
    fail("recordPOD(upload)", upErr);

    const { data, error } = await supabase
      .from("shipment_documents")
      .insert({
        shipment_id: shipmentId,
        doc_type: "proof_of_delivery",
        reference: tx.reference,
        status: "submitted",
        version: 1,
        file_path: path,
        generated_by: userId,
        payload: asJson({ fileName: file.name }),
      })
      .select(DOC_SELECT)
      .single();
    fail("recordPOD(insert)", error);

    await supabaseApi.createOpEvent({
      shipmentId,
      eventType: "pod_recorded",
      step: 13,
      note: `POD uploaded · ${file.name}`,
      payload: { fileName: file.name, path },
    });
    return mapDocument(data as unknown as DocRow);
  },

  // ── RBAC & admin user management (Phase 2 §7) ───────────────────────────
  async updateUserRole(userId, role): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ role: dbRole(role) as DbUserRole })
      .eq("id", userId);
    fail("updateUserRole", error);
  },

  async setUserSuspended(userId, suspended): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ status: suspended ? "suspended" : "active" })
      .eq("id", userId);
    fail("setUserSuspended", error);
  },

  async inviteUser(email, role): Promise<void> {
    // Invitation is issued server-side (admin API needs the service role). The
    // edge function / admin tooling owns auth.admin.inviteUserByEmail; here we
    // record the intent + notify so the flow is wired without leaking secrets.
    const dbRole =
      role === "Source" ? "source_user" : role === "Admin" ? "operations_admin" : "demand_user";
    await notifier.notify({
      title: "User invitation requested",
      body: `${email} (${role})`,
      kind: "info",
      email: { to: email, template: "registration_submitted", data: { name: email } },
    });
    void dbRole;
  },

  // ── Notifications (Phase 2 §8) ──────────────────────────────────────────
  async listNotifications(): Promise<NotificationItem[]> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,kind,link,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    fail("listNotifications", error);
    type Row = {
      id: string;
      title: string;
      body: string | null;
      kind: string;
      link: string | null;
      read_at: string | null;
      created_at: string;
    };
    return ((data ?? []) as unknown as Row[]).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body ?? undefined,
      kind: (n.kind as NotificationItem["kind"]) ?? "info",
      link: n.link ?? undefined,
      readAt: n.read_at ?? undefined,
      createdAt: n.created_at,
    }));
  },

  async markNotificationRead(id): Promise<void> {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    fail("markNotificationRead", error);
  },

  async markAllNotificationsRead(): Promise<void> {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    fail("markAllNotificationsRead", error);
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("prefs")
      .eq("user_id", userId)
      .maybeSingle();
    fail("getNotificationPreferences", error);
    const row = data as { prefs: NotificationPreferences } | null;
    return row?.prefs ?? DEFAULT_NOTIF_PREFS;
  },

  async updateNotificationPreferences(prefs): Promise<void> {
    const userId = await currentUserId();
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, prefs }, { onConflict: "user_id" });
    fail("updateNotificationPreferences", error);
  },

  // ── Pulse / Rate & Price Intelligence (Phase 2 §5) ──────────────────────
  async listLaneRates(): Promise<LaneRate[]> {
    const { data, error } = await supabase
      .from("lane_rates")
      .select("id,origin,destination,mode,period,provider_name,price,transit_days")
      .order("period", { ascending: true });
    fail("listLaneRates", error);
    type Row = {
      id: string;
      origin: string;
      destination: string;
      mode: string;
      period: string;
      provider_name: string;
      price: number;
      transit_days: number;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      origin: r.origin,
      destination: r.destination,
      mode: r.mode as LaneRate["mode"],
      period: r.period,
      providerName: r.provider_name,
      priceZAR: Number(r.price),
      transitDays: r.transit_days,
    }));
  },

  async listRateBenchmarks(): Promise<RateBenchmark[]> {
    return buildRateBenchmarks(await supabaseApi.listLaneRates());
  },

  async getRateSubscription(): Promise<RateSubscription> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("rate_subscriptions")
      .select("plan,status,current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    fail("getRateSubscription", error);
    const row = data as {
      plan: string | null;
      status: string;
      current_period_end: string | null;
    } | null;
    if (!row) return { status: "none" };
    return {
      status: (row.status as RateSubscription["status"]) ?? "none",
      plan: (row.plan as RateSubscription["plan"]) ?? undefined,
      currentPeriodEnd: row.current_period_end ?? undefined,
    };
  },

  async startPulseCheckout(plan): Promise<{ url: string | null }> {
    const activateDemo = async (): Promise<{ url: string | null }> => {
      const { error } = await supabase.rpc("activate_pulse_demo", { p_plan: plan });
      fail("startPulseCheckout(demo)", error);
      return { url: null };
    };

    try {
      const { data: auth } = await supabase.auth.getUser();
      return await invokeEdge<{ url: string | null }>("create-checkout-session", {
        plan,
        email: auth.user?.email,
      });
    } catch {
      // Edge unavailable or Stripe not configured — local demo entitlement.
      return activateDemo();
    }
  },

  async listPriceAlerts(): Promise<PriceAlert[]> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("price_alerts")
      .select("id,lane,mode,threshold,direction,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    fail("listPriceAlerts", error);
    type Row = {
      id: string;
      lane: string;
      mode: string;
      threshold: number;
      direction: string;
      created_at: string;
    };
    return ((data ?? []) as unknown as Row[]).map((a) => ({
      id: a.id,
      lane: a.lane,
      mode: a.mode as PriceAlert["mode"],
      thresholdZAR: Number(a.threshold),
      direction: a.direction as PriceAlert["direction"],
      createdAt: a.created_at,
    }));
  },

  async createPriceAlert(input): Promise<PriceAlert> {
    const userId = await currentUserId();
    const { data, error } = await supabase
      .from("price_alerts")
      .insert({
        user_id: userId,
        lane: input.lane,
        mode: input.mode,
        threshold: input.thresholdZAR,
        direction: input.direction,
      })
      .select("id,lane,mode,threshold,direction,created_at")
      .single();
    fail("createPriceAlert", error);
    const a = data as unknown as {
      id: string;
      lane: string;
      mode: string;
      threshold: number;
      direction: string;
      created_at: string;
    };
    return {
      id: a.id,
      lane: a.lane,
      mode: a.mode as PriceAlert["mode"],
      thresholdZAR: Number(a.threshold),
      direction: a.direction as PriceAlert["direction"],
      createdAt: a.created_at,
    };
  },

  // ── Analytics: derived from live shipments + quotes (RLS-scoped) ─────────
  async dashboardSeries(): Promise<DashboardSeries> {
    const txs = await supabaseApi.listTransactions();
    return buildDashboardSeriesFromTransactions(txs);
  },
  async getDashboardMetrics() {
    const [
      transactions,
      invoices,
      trips,
      registrations,
      complianceFlags,
      auditEvents,
      shipmentRequests,
    ] = await Promise.all([
      supabaseApi.listTransactions(),
      supabaseApi.listInvoices(),
      supabaseApi.listTrips(),
      supabaseApi.listRegistrations(),
      supabaseApi.listComplianceFlags(),
      supabaseApi.listAuditEvents(),
      supabaseApi.listShipmentRequests(),
    ]);
    return computeDashboardMetrics({
      transactions,
      invoices,
      trips,
      registrations,
      complianceFlags,
      auditEvents,
      shipmentRequests,
    });
  },

  // ── Ops modules: live tables (RLS-scoped to client/provider company) ─────
  async listWarehouseJobs(): Promise<WarehouseJob[]> {
    const { data, error } = await supabase
      .from("warehouse_jobs")
      .select(
        "id,reference,warehouse_type,client_company_id,location,status,checklist,created_at," +
          "client:companies!warehouse_jobs_client_company_id_fkey(name)," +
          "shipment:shipments!warehouse_jobs_shipment_id_fkey(reference)",
      )
      .order("created_at", { ascending: false });
    fail("listWarehouseJobs", error);
    type Row = {
      id: string;
      reference: string;
      warehouse_type: string;
      client_company_id: string;
      location: string;
      status: string;
      checklist: { step: string; done: boolean }[];
      created_at: string;
      client: { name: string } | null;
      shipment: { reference: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      reference: r.reference,
      warehouseType: r.warehouse_type as WarehouseJob["warehouseType"],
      clientId: r.client_company_id,
      client: r.client?.name ?? "—",
      location: r.location,
      status: r.status as WarehouseJob["status"],
      checklist: r.checklist ?? [],
      shipmentRef: r.shipment?.reference,
      createdAt: r.created_at,
    }));
  },

  async listContainerJobs(): Promise<ContainerJob[]> {
    const { data, error } = await supabase
      .from("container_jobs")
      .select(
        "id,container_no,job_type,vessel,dwell_days,damage,status,created_at," +
          "shipment:shipments!container_jobs_shipment_id_fkey(reference)",
      )
      .order("created_at", { ascending: false });
    fail("listContainerJobs", error);
    type Row = {
      id: string;
      container_no: string;
      job_type: string;
      vessel: string | null;
      dwell_days: number;
      damage: boolean;
      status: string;
      created_at: string;
      shipment: { reference: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      containerNo: r.container_no,
      type: r.job_type as ContainerJob["type"],
      vessel: r.vessel ?? undefined,
      dwellDays: r.dwell_days,
      damage: r.damage,
      status: r.status as ContainerJob["status"],
      shipmentRef: r.shipment?.reference,
      createdAt: r.created_at,
    }));
  },

  async listCargoHandling(): Promise<CargoHandling[]> {
    const { data, error } = await supabase
      .from("cargo_handling")
      .select(
        "id,reference,operation,weight_kg,condition,handled_at," +
          "shipment:shipments!cargo_handling_shipment_id_fkey(reference)",
      )
      .order("handled_at", { ascending: false });
    fail("listCargoHandling", error);
    type Row = {
      id: string;
      reference: string;
      operation: string;
      weight_kg: number;
      condition: string;
      handled_at: string;
      shipment: { reference: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      reference: r.reference,
      operation: r.operation as CargoHandling["operation"],
      weightKg: Number(r.weight_kg),
      condition: r.condition as CargoHandling["condition"],
      timestamp: r.handled_at,
      shipmentRef: r.shipment?.reference,
    }));
  },

  async listTrips(): Promise<Trip[]> {
    const { data, error } = await supabase
      .from("trips")
      .select(
        "id,reference,vehicle,driver,origin,destination,status,progress_pct,pod_uploaded,lat,lng,client_company_id,created_at," +
          "shipment:shipments!trips_shipment_id_fkey(reference,cargo_description,required_date)," +
          "clientco:companies!trips_client_company_id_fkey(name)",
      )
      .order("created_at", { ascending: false });
    fail("listTrips", error);
    type Row = {
      id: string;
      reference: string;
      vehicle: string;
      driver: string;
      origin: string;
      destination: string;
      status: string;
      progress_pct: number;
      pod_uploaded: boolean;
      lat: number | null;
      lng: number | null;
      client_company_id: string | null;
      created_at: string;
      shipment: {
        reference: string;
        cargo_description: string | null;
        required_date: string | null;
      } | null;
      clientco: { name: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      reference: r.reference,
      vehicle: r.vehicle,
      driver: r.driver,
      origin: r.origin,
      destination: r.destination,
      status: r.status as Trip["status"],
      progressPct: r.progress_pct,
      podUploaded: r.pod_uploaded,
      lat: r.lat ?? 0,
      lng: r.lng ?? 0,
      shipmentRef: r.shipment?.reference,
      cargo: r.shipment?.cargo_description ?? undefined,
      clientCompanyId: r.client_company_id ?? undefined,
      client: r.clientco?.name,
      createdAt: r.created_at,
      etaAt: r.shipment?.required_date ?? undefined,
    }));
  },

  async listTripWaypoints(tripId): Promise<TripWaypoint[]> {
    const { data, error } = await supabase
      .from("trip_waypoints")
      .select("seq,lat,lng,label,recorded_at")
      .eq("trip_id", tripId)
      .order("seq");
    fail("listTripWaypoints", error);
    type Row = { seq: number; lat: number; lng: number; label: string | null; recorded_at: string };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      seq: r.seq,
      lat: r.lat,
      lng: r.lng,
      label: r.label ?? undefined,
      recordedAt: r.recorded_at,
    }));
  },

  async getCompanyProfile(companyId): Promise<CompanyProfile | null> {
    const { data: c, error } = await supabase
      .from("companies")
      .select(
        "id,name,type,registration_number,vat_number,city,country,contact_person,contact_email,contact_phone,risk_rating,approval_status,created_at",
      )
      .eq("id", companyId)
      .maybeSingle();
    fail("getCompanyProfile", error);
    if (!c) return null;
    type Row = {
      id: string;
      name: string;
      type: string;
      registration_number: string | null;
      vat_number: string | null;
      city: string | null;
      country: string | null;
      contact_person: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      risk_rating: string | null;
      approval_status: string;
      created_at: string;
    };
    const row = c as unknown as Row;

    // Activity stats (all RLS-scoped; counts come back 0 for what you can't see).
    const [ship, inv, docs] = await Promise.all([
      supabase
        .from("shipments")
        .select("id", { count: "exact", head: true })
        .or(`demand_company_id.eq.${companyId},source_company_id.eq.${companyId}`),
      supabase
        .from("invoices")
        .select("amount_cents,status")
        .or(`client_company_id.eq.${companyId},provider_company_id.eq.${companyId}`),
      supabase
        .from("compliance_documents")
        .select("verification_status")
        .eq("company_id", companyId),
    ]);
    const invoices = (inv.data ?? []) as { amount_cents: number; status: string }[];
    const cdocs = (docs.data ?? []) as { verification_status: string | null }[];
    return {
      id: row.id,
      name: row.name,
      type: row.type === "source" ? "Source" : "Demand",
      registrationNumber: row.registration_number ?? undefined,
      vatNumber: row.vat_number ?? undefined,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      contactPerson: row.contact_person ?? undefined,
      contactEmail: row.contact_email ?? undefined,
      contactPhone: row.contact_phone ?? undefined,
      riskRating: row.risk_rating ?? undefined,
      approvalStatus: row.approval_status,
      memberSince: row.created_at,
      stats: {
        shipments: ship.count ?? 0,
        invoicesTotalZAR: Math.round(invoices.reduce((s, i) => s + i.amount_cents, 0) / 100),
        invoicesOutstandingZAR: Math.round(
          invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount_cents, 0) / 100,
        ),
        complianceDocs: cdocs.length,
        complianceVerified: cdocs.filter((d) => d.verification_status === "verified").length,
      },
    };
  },

  async listInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id,number,transaction_ref,client_company_id,provider_company_id,amount_cents,issued_at,due_at,status," +
          "client:companies!invoices_client_company_id_fkey(name),provider:companies!invoices_provider_company_id_fkey(name)",
      )
      .order("issued_at", { ascending: false });
    fail("listInvoices", error);
    type Row = {
      id: string;
      number: string;
      transaction_ref: string | null;
      client_company_id: string;
      provider_company_id: string | null;
      amount_cents: number;
      issued_at: string;
      due_at: string | null;
      status: string;
      client: { name: string } | null;
      provider: { name: string } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      number: r.number,
      transactionRef: r.transaction_ref ?? "—",
      clientId: r.client_company_id,
      client: r.client?.name ?? "—",
      providerId: r.provider_company_id ?? "",
      provider: r.provider?.name ?? "—",
      amountZAR: Math.round(r.amount_cents / 100),
      issuedAt: r.issued_at,
      dueAt: r.due_at ?? r.issued_at,
      status: r.status as Invoice["status"],
    }));
  },

  async listPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("id,invoice_number,amount_cents,method,gateway_status,settled_at")
      .order("created_at", { ascending: false });
    fail("listPayments", error);
    type Row = {
      id: string;
      invoice_number: string | null;
      amount_cents: number;
      method: string;
      gateway_status: string;
      settled_at: string | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number ?? "—",
      amountZAR: Math.round(r.amount_cents / 100),
      method: r.method as Payment["method"],
      gatewayStatus: r.gateway_status as Payment["gatewayStatus"],
      settledAt: r.settled_at ?? undefined,
    }));
  },

  async listComplianceFlags(): Promise<ComplianceFlag[]> {
    const { data, error } = await supabase
      .from("compliance_flags")
      .select("id,entity_company_id,entity_label,area,severity,status,noted_at")
      .order("noted_at", { ascending: false });
    fail("listComplianceFlags", error);
    type Row = {
      id: string;
      entity_company_id: string | null;
      entity_label: string;
      area: string;
      severity: string;
      status: string;
      noted_at: string;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      entityId: r.entity_company_id ?? "",
      entity: r.entity_label,
      area: r.area as ComplianceFlag["area"],
      severity: r.severity as ComplianceFlag["severity"],
      status: r.status as ComplianceFlag["status"],
      notedAt: r.noted_at,
    }));
  },
};
