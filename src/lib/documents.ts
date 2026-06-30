import type { DocumentType } from "@/types";

/**
 * Lossless reconciliation between the DB `doc_type` enum (snake_case) and the
 * UI DocumentType labels. The map is bijective so a value can round-trip
 * DB → UI → DB without loss. Phase-1 templates are active; the logistics set is
 * scaffolded (disabled) until Phase 2.
 *
 * NOTE (assumption — no live DB access here): the enum is inferred from the
 * existing supabaseApi map plus the Methodology §4.7.2 template list. If the
 * live enum differs, only this file needs updating.
 */
export type DbDocType =
  // Phase 1 (active)
  | "rfq"
  | "source_selection"
  | "formal_quote"
  | "purchase_order"
  | "proforma_invoice"
  | "proof_of_service"
  | "tax_invoice"
  | "proof_of_payment"
  | "transaction_summary"
  | "commercial_invoice"
  | "packing_list"
  | "import_permit"
  | "insurance_certificate"
  // Phase 2 (scaffolded)
  | "bill_of_lading"
  | "customs_declaration"
  | "delivery_note"
  | "warehouse_receipt"
  | "transport_manifest"
  | "sars_clearing"
  | "proof_of_delivery";

export const DOC_DB_TO_LABEL: Record<DbDocType, DocumentType> = {
  rfq: "RFQ",
  source_selection: "Source Selection",
  formal_quote: "Formal Quote",
  purchase_order: "Purchase Order",
  proforma_invoice: "Pro-forma Invoice",
  proof_of_service: "Proof of Service Completion",
  tax_invoice: "Tax Invoice",
  proof_of_payment: "Proof of Payment",
  transaction_summary: "Transaction Summary",
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  import_permit: "Import Permit",
  insurance_certificate: "Insurance Certificate",
  bill_of_lading: "Bill of Lading",
  customs_declaration: "Customs Declaration",
  delivery_note: "Delivery Note",
  warehouse_receipt: "Warehouse Receipt",
  transport_manifest: "Transport Manifest",
  sars_clearing: "SARS Clearing Document",
  proof_of_delivery: "Proof of Delivery",
};

export const DOC_LABEL_TO_DB = Object.fromEntries(
  Object.entries(DOC_DB_TO_LABEL).map(([db, label]) => [label, db]),
) as Record<DocumentType, DbDocType>;

export function labelFromDb(db: string): DocumentType {
  return DOC_DB_TO_LABEL[db as DbDocType] ?? "Transaction Summary";
}
export function dbFromLabel(label: DocumentType): DbDocType {
  return DOC_LABEL_TO_DB[label] ?? "transaction_summary";
}

export interface TemplateMeta {
  label: DocumentType;
  db: DbDocType;
  /** Phase-1 templates are usable now; Phase-2 are disabled scaffolds. */
  phase: 1 | 2;
}

const ORDER: DbDocType[] = [
  "rfq",
  "source_selection",
  "formal_quote",
  "purchase_order",
  "proforma_invoice",
  "proof_of_service",
  "tax_invoice",
  "proof_of_payment",
  "transaction_summary",
  "commercial_invoice",
  "packing_list",
  "import_permit",
  "insurance_certificate",
  // Phase 2
  "bill_of_lading",
  "customs_declaration",
  "delivery_note",
  "warehouse_receipt",
  "transport_manifest",
  "sars_clearing",
  "proof_of_delivery",
];

const PHASE2 = new Set<DbDocType>([
  "bill_of_lading",
  "customs_declaration",
  "delivery_note",
  "warehouse_receipt",
  "transport_manifest",
  "sars_clearing",
  "proof_of_delivery",
]);

export const DOC_TEMPLATES: TemplateMeta[] = ORDER.map((db) => ({
  db,
  label: DOC_DB_TO_LABEL[db],
  phase: PHASE2.has(db) ? 2 : 1,
}));

export const PHASE1_TEMPLATES = DOC_TEMPLATES.filter((t) => t.phase === 1);
export const PHASE2_TEMPLATES = DOC_TEMPLATES.filter((t) => t.phase === 2);
