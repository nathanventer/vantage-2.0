import * as M from "@/data/mock";
import { buildDashboardSeriesFromTransactions } from "@/lib/dashboardSeries";
import { optimizer, type ScoredQuote } from "@/adapters/optimizer";
import type { MacroStage, Quote, Transaction } from "@/types";
import type { DataService } from "./DataService";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const MACRO_STAGES: MacroStage[] = [
  "Vessel",
  "Port",
  "Clearing",
  "Transport",
  "Warehouse",
  "Delivery",
];
const stageForStep = (step: number): MacroStage =>
  MACRO_STAGES[Math.min(Math.floor((step - 1) / 3), MACRO_STAGES.length - 1)];

/** In-memory reference counter, seeded past the 24 generated demo shipments. */
let refCounter = 1000 + M.transactions.length;

function scoreInputs(t: Transaction) {
  return t.quotes.map((q) => ({
    id: q.id,
    providerId: q.providerId,
    providerName: q.providerName,
    priceZAR: q.priceZAR,
    etaDays: q.etaDays,
  }));
}

export const mockApi: DataService = {
  async listCompanies() {
    await delay();
    return M.companies;
  },
  async listProviders() {
    await delay();
    return M.providers;
  },
  async listUsers() {
    await delay();
    return M.users;
  },
  async listTransactions() {
    await delay();
    return M.transactions;
  },
  async getTransaction(id: string) {
    await delay();
    return M.transactions.find((t) => t.id === id || t.reference === id) ?? null;
  },
  async listShipmentRequests() {
    await delay();
    return M.shipmentRequests;
  },
  async listWarehouseJobs() {
    await delay();
    return M.warehouseJobs;
  },
  async listContainerJobs() {
    await delay();
    return M.containerJobs;
  },
  async listCargoHandling() {
    await delay();
    return M.cargoHandling;
  },
  async listTrips() {
    await delay();
    return M.trips;
  },
  async listDocuments() {
    await delay();
    return M.documents;
  },
  async listInvoices() {
    await delay();
    return M.invoices;
  },
  async listPayments() {
    await delay();
    return M.payments;
  },
  async listComplianceFlags() {
    await delay();
    return M.complianceFlags;
  },
  async listAuditEvents() {
    await delay();
    return M.auditEvents;
  },
  async listRegistrations() {
    await delay();
    return M.registrations;
  },
  async approveCompany(companyId) {
    await delay();
    const r = M.registrations.find((x) => x.id === companyId || x.companyId === companyId);
    if (r) {
      r.status = "Approved";
      r.rejectionReason = undefined;
    }
  },
  async rejectCompany(companyId, reason) {
    await delay();
    const r = M.registrations.find((x) => x.id === companyId || x.companyId === companyId);
    if (r) {
      r.status = "Rejected";
      r.rejectionReason = reason;
    }
  },
  async setCompanyPending(companyId) {
    await delay();
    const r = M.registrations.find((x) => x.id === companyId || x.companyId === companyId);
    if (r) r.status = "Pending";
  },
  async updateVerificationChecklist(companyId, checklist) {
    await delay();
    const r = M.registrations.find((x) => x.id === companyId || x.companyId === companyId);
    if (r) r.verificationChecklist = checklist;
  },
  // Onboarding write-path — no-ops for the offline demo.
  async setRoleIntent() {
    await delay();
  },
  async saveCompany() {
    await delay();
    return "mock-company";
  },
  async recordComplianceDocument() {
    await delay();
  },
  async capturePopiaConsent() {
    await delay();
  },
  async submitCompanyForReview() {
    await delay();
  },
  async updateOnboardingStep() {
    await delay();
  },
  async dashboardSeries() {
    await delay();
    return buildDashboardSeriesFromTransactions(M.transactions);
  },

  // ── Shipment & quote write-path (Section F) ──────────────────────────────
  async createShipment(input) {
    await delay();
    refCounter += 1;
    const reference = `VTG-TXN-${refCounter}`;
    const demand = M.companies[0];
    const matched = M.providers.slice(0, 4);
    const quotes: Quote[] = matched.map((p, i) => ({
      id: `q-${reference}-${i}`,
      providerId: p.id,
      providerName: p.name,
      priceZAR: 120_000 + i * 18_500 + (refCounter % 7) * 2_100,
      etaDays: 6 + i + (refCounter % 3),
      status: "Quoted",
    }));
    const tx: Transaction = {
      id: `txn-${reference}`,
      reference,
      demandCompanyId: demand.id,
      demandCompany: demand.name,
      sourceProviderId: "",
      sourceProvider: "",
      origin: input.origin,
      destination: input.destination,
      cargo: input.cargo,
      valueZAR: input.valueZAR ?? input.weightTons * 32_000,
      containerNo: input.containerType,
      status: "Open",
      currentStage: stageForStep(1),
      createdAt: new Date().toISOString(),
      steps: M.makeLifecycleSteps(1),
      quotes,
    };
    M.transactions.unshift(tx);
    M.auditEvents.unshift({
      id: `ae-${reference}`,
      actor: "you@demo",
      action: "shipment.create",
      entity: reference,
      timestamp: tx.createdAt,
    });
    return tx;
  },

  async scoreQuotes(shipmentId): Promise<ScoredQuote[]> {
    await delay();
    const tx = M.transactions.find((t) => t.id === shipmentId || t.reference === shipmentId);
    if (!tx) throw new Error(`[mockApi] shipment not found: ${shipmentId}`);
    return optimizer.score(scoreInputs(tx)).ranked;
  },

  async selectQuote(shipmentId, quoteId, reason) {
    await delay();
    const tx = M.transactions.find((t) => t.id === shipmentId || t.reference === shipmentId);
    if (!tx) throw new Error(`[mockApi] shipment not found: ${shipmentId}`);
    const result = optimizer.score(scoreInputs(tx));
    if (result.recommendedQuoteId && quoteId !== result.recommendedQuoteId && !reason?.trim()) {
      throw new Error("source_override_reason required when overriding the recommended quote");
    }
    const chosen = tx.quotes.find((q) => q.id === quoteId);
    if (!chosen) throw new Error(`[mockApi] quote not found: ${quoteId}`);
    tx.quotes.forEach((q) => (q.status = q.id === quoteId ? "Accepted" : "Quoted"));
    tx.sourceProviderId = chosen.providerId;
    tx.sourceProvider = chosen.providerName;
    tx.status = "In Progress";
    tx.steps = M.makeLifecycleSteps(4);
    tx.currentStage = stageForStep(4);
    M.auditEvents.unshift({
      id: `ae-${tx.reference}-sel`,
      actor: "you@demo",
      action: reason ? "quote.select.override" : "quote.select",
      entity: tx.reference,
      timestamp: new Date().toISOString(),
    });
  },
};

export type MockApi = typeof mockApi;
