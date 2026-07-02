import * as M from "@/data/mock";
import { buildDashboardSeriesFromTransactions } from "@/lib/dashboardSeries";
import { computeDashboardMetrics } from "@/lib/demoKpis";
import { buildRateBenchmarks } from "@/lib/pulse";
import { optimizer, type ScoredQuote } from "@/adapters/optimizer";
import { signatureProvider } from "@/adapters/signatureProvider";
import { notifier } from "@/adapters/notifier";
import type {
  DocumentRecord,
  MacroStage,
  NotificationItem,
  NotificationPreferences,
  PriceAlert,
  Quote,
  RateSubscription,
  Transaction,
} from "@/types";
import { formatReference } from "@/lib/references";
import { COMPLIANCE_BUCKET, complianceDocPath, TRANSACTION_BUCKET } from "@/lib/storagePaths";
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

/** In-memory blob store for offline compliance/POD uploads. */
const mockBlobs = new Map<string, Blob>();

/** In-memory reference counter, seeded past generated demo shipments. */
let refCounter = 1125;
let docCounter = M.documents.length;

/** Pulse subscription + alerts (mutable demo state). Pre-active for buyer demos. */
let pulseSub: RateSubscription = {
  status: "active",
  plan: "standard",
  currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
};
const priceAlerts: PriceAlert[] = [];

/** Notifications (mutable demo state). */
const notifications: NotificationItem[] = [
  {
    id: "ntf-1",
    title: "Quote received",
    body: "Southern Cross quoted TXN-1002 — R128,800 all-in.",
    kind: "info",
    link: "/transactions",
    createdAt: new Date(Date.now() - 36e5).toISOString(),
  },
  {
    id: "ntf-2",
    title: "Registration approved",
    body: "Ubuntu Retail Imports (Pty) Ltd is now active.",
    kind: "success",
    link: "/admin/registrations",
    createdAt: new Date(Date.now() - 9e6).toISOString(),
  },
  {
    id: "ntf-3",
    title: "Customs inspection hold",
    body: "SARS hold on TXN-1004 — documentation review required.",
    kind: "warning",
    link: "/transactions",
    readAt: new Date(Date.now() - 8e6).toISOString(),
    createdAt: new Date(Date.now() - 9e6).toISOString(),
  },
  {
    id: "ntf-4",
    title: "Payment verified",
    body: "INV-5001 (R203,000) settled for TXN-1001.",
    kind: "success",
    link: "/payments",
    createdAt: new Date(Date.now() - 2e6).toISOString(),
  },
  {
    id: "ntf-5",
    title: "Shipment delivered",
    body: "TXN-1003 completed — POD uploaded.",
    kind: "info",
    link: "/transactions",
    createdAt: new Date(Date.now() - 5e6).toISOString(),
  },
];

const DEFAULT_PREFS: NotificationPreferences = {
  registration: { inApp: true, email: true },
  quote: { inApp: true, email: true },
  payment: { inApp: true, email: true },
  shipment: { inApp: true, email: false },
  document: { inApp: true, email: false },
  exception: { inApp: true, email: true },
};
let notifPrefs: NotificationPreferences = { ...DEFAULT_PREFS };

function findDoc(docId: string) {
  const doc = M.documents.find((d) => d.id === docId);
  if (!doc) throw new Error(`[mockApi] document not found: ${docId}`);
  return doc;
}

/** Mutate a shipment's lifecycle to a 1–16 step (steps, stage, status). */
function applyStep(tx: Transaction, toStep: number) {
  const step = Math.min(Math.max(1, toStep), M.STEP_LABELS.length);
  const now = new Date().toISOString();
  tx.steps = M.STEP_LABELS.map((label, idx) => {
    const index = idx + 1;
    const prior = tx.steps.find((s) => s.index === index);
    return {
      index,
      label,
      status: index < step ? "Completed" : index === step ? "In Progress" : "Pending",
      timestamp: index < step ? (prior?.timestamp ?? now) : index === step ? now : undefined,
    };
  });
  tx.currentStage = M.macroForStep(step);
  tx.status = step >= 16 ? "Closed" : step < 4 ? "Open" : "In Progress";
}

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
  async listTripWaypoints(tripId) {
    await delay();
    const trip = M.trips.find((t) => t.id === tripId || t.reference === tripId);
    if (!trip) return [];
    // Deterministic 5-point trace along the DBN→JHB corridor toward the
    // trip's current position (mirrors the live trip_waypoints seed).
    const LABELS = ["Depart port", "N3 Pietermaritzburg", "N3 Harrismith", "N3 Villiers", "Arrive"];
    const n = trip.status === "Delivered" ? 5 : Math.max(1, Math.floor(trip.progressPct / 20));
    const from = { lat: -29.8587, lng: 31.0218 };
    return Array.from({ length: n }, (_, i) => {
      const f = (i + 1) / 5;
      return {
        seq: i + 1,
        lat: from.lat + (trip.lat - from.lat) * f,
        lng: from.lng + (trip.lng - from.lng) * f,
        label: LABELS[i],
        recordedAt: new Date(Date.now() - (n - i) * 3 * 3_600_000).toISOString(),
      };
    });
  },
  async getCompanyProfile(companyId) {
    await delay();
    const c =
      M.companies.find((x) => x.id === companyId) ??
      M.providers.find((x) => x.id === companyId) ??
      null;
    if (!c) return null;
    const invoices = M.invoices.filter(
      (i) => i.clientId === companyId || i.providerId === companyId,
    );
    return {
      id: c.id,
      name: c.name,
      type: c.category,
      city: "Johannesburg",
      country: "South Africa",
      approvalStatus: "approved",
      memberSince: "2025-02-01T00:00:00Z",
      stats: {
        shipments: M.transactions.filter(
          (t) => t.demandCompanyId === companyId || t.sourceProviderId === companyId,
        ).length,
        invoicesTotalZAR: invoices.reduce((s, i) => s + i.amountZAR, 0),
        invoicesOutstandingZAR: invoices
          .filter((i) => i.status !== "Paid")
          .reduce((s, i) => s + i.amountZAR, 0),
        complianceDocs: 8,
        complianceVerified: 7,
      },
    };
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
  async recordComplianceDocument(companyId, docType, file) {
    await delay();
    const path = complianceDocPath(companyId, docType, file.name);
    mockBlobs.set(`${COMPLIANCE_BUCKET}:${path}`, file);
  },
  async getSignedStorageUrl(bucket, path) {
    await delay();
    const blob = mockBlobs.get(`${bucket}:${path}`);
    if (!blob) throw new Error(`[mockApi] object not found: ${bucket}/${path}`);
    return URL.createObjectURL(blob);
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
  async getDashboardMetrics() {
    await delay();
    return computeDashboardMetrics({
      transactions: M.transactions,
      invoices: M.invoices,
      trips: M.trips,
      registrations: M.registrations,
      complianceFlags: M.complianceFlags,
      auditEvents: M.auditEvents,
      shipmentRequests: M.shipmentRequests,
    });
  },

  // ── Shipment & quote write-path (Section F) ──────────────────────────────
  async createShipment(input) {
    await delay();
    refCounter += 1;
    const reference = formatReference("TXN", refCounter);
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

  // ── Document write-path (Section C) ──────────────────────────────────────
  async createDocument(input) {
    await delay();
    docCounter += 1;
    const doc: DocumentRecord = {
      id: `doc-new-${docCounter}`,
      type: input.type,
      transactionRef: input.transactionRef,
      shipmentId: input.shipmentId,
      uploadedById: "you",
      uploadedBy: "You",
      uploadedAt: new Date().toISOString(),
      status: "Draft",
      signed: false,
      sarsVerified: false,
      version: 1,
      payload: input.payload ?? {},
    };
    M.documents.unshift(doc);
    return doc;
  },

  async versionDocument(docId, payload) {
    await delay();
    const doc = findDoc(docId);
    doc.payload = payload;
    doc.version += 1;
    doc.status = "Submitted";
    return doc;
  },

  async signDocument(docId, fullName) {
    await delay();
    const doc = findDoc(docId);
    const sig = signatureProvider.sign(fullName);
    doc.signed = true;
    doc.signedBy = sig.signedBy;
    doc.signedAt = sig.signedAt;
    doc.signatureToken = sig.token;
    doc.status = "Verified";
    return doc;
  },

  async approveDocument(docId) {
    await delay();
    const doc = findDoc(docId);
    doc.status = "Approved";
    doc.sarsVerified = true;
    return doc;
  },

  // ── Logistics operations execution (Phase 2 §1) ─────────────────────────
  async listShipmentEvents(shipmentId) {
    await delay();
    return M.shipmentEvents
      .filter((e) => e.shipmentId === shipmentId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async createOpEvent(input) {
    await delay();
    const tx = M.transactions.find((t) => t.id === input.shipmentId);
    if (!tx) throw new Error(`[mockApi] shipment not found: ${input.shipmentId}`);
    const evt = {
      id: `evt-${tx.id}-${Date.now()}`,
      shipmentId: tx.id,
      reference: tx.reference,
      eventType: input.eventType,
      step: input.step,
      note: input.note,
      payload: input.payload,
      actor: "you@demo",
      createdAt: new Date().toISOString(),
    };
    M.shipmentEvents.unshift(evt);
    M.auditEvents.unshift({
      id: `ae-op-${evt.id}`,
      actor: "you@demo",
      action: `ops.${input.eventType}`,
      entity: tx.reference,
      timestamp: evt.createdAt,
    });
    if (typeof input.step === "number") applyStep(tx, input.step);
    return evt;
  },

  async advanceShipmentStep(shipmentId, toStep) {
    await delay();
    const tx = M.transactions.find((t) => t.id === shipmentId);
    if (!tx) throw new Error(`[mockApi] shipment not found: ${shipmentId}`);
    applyStep(tx, toStep);
    const label = M.STEP_LABELS[toStep - 1] ?? `Step ${toStep}`;
    M.shipmentEvents.unshift({
      id: `evt-${tx.id}-${Date.now()}`,
      shipmentId: tx.id,
      reference: tx.reference,
      eventType: "step_advanced",
      step: toStep,
      note: label,
      actor: "you@demo",
      createdAt: new Date().toISOString(),
    });
    M.auditEvents.unshift({
      id: `ae-step-${tx.id}-${toStep}-${Date.now()}`,
      actor: "you@demo",
      action: "ops.step_advanced",
      entity: tx.reference,
      timestamp: new Date().toISOString(),
    });
    return tx;
  },

  async scheduleTransport(input) {
    return this.createOpEvent({
      shipmentId: input.shipmentId,
      eventType: "transport_scheduled",
      step: 11,
      note: `Transport scheduled · ${input.vehicle} · ${input.driver}`,
      payload: { vehicle: input.vehicle, driver: input.driver, etd: input.etd, eta: input.eta },
    });
  },

  async recordPOD(shipmentId, file) {
    await delay();
    const tx = M.transactions.find((t) => t.id === shipmentId);
    if (!tx) throw new Error(`[mockApi] shipment not found: ${shipmentId}`);
    const path = `${tx.demandCompanyId}/pod/${tx.reference}-${Date.now()}.pdf`;
    mockBlobs.set(`${TRANSACTION_BUCKET}:${path}`, file);
    docCounter += 1;
    const doc: DocumentRecord = {
      id: `doc-pod-${docCounter}`,
      type: "Proof of Delivery",
      transactionRef: tx.reference,
      shipmentId: tx.id,
      uploadedById: "you",
      uploadedBy: "You",
      uploadedAt: new Date().toISOString(),
      status: "Submitted",
      signed: false,
      sarsVerified: false,
      version: 1,
      payload: { fileName: file.name, notes: `POD captured (${Math.round(file.size / 1024)} KB)` },
    };
    M.documents.unshift(doc);
    await this.createOpEvent({
      shipmentId: tx.id,
      eventType: "pod_recorded",
      step: 13,
      note: `POD uploaded · ${file.name}`,
      payload: { fileName: file.name },
    });
    return doc;
  },

  // ── RBAC & admin user management (Phase 2 §7) ───────────────────────────
  async updateUserRole(userId, role) {
    await delay();
    const u = M.users.find((x) => x.id === userId || x.email === userId);
    if (u) u.role = role;
    M.auditEvents.unshift({
      id: `ae-role-${Date.now()}`,
      actor: "you@demo",
      action: "user.role_changed",
      entity: userId,
      timestamp: new Date().toISOString(),
    });
  },
  async setUserSuspended(userId, suspended) {
    await delay();
    const u = M.users.find((x) => x.id === userId || x.email === userId);
    if (u) u.status = suspended ? "Suspended" : "Active";
    M.auditEvents.unshift({
      id: `ae-susp-${Date.now()}`,
      actor: "you@demo",
      action: suspended ? "user.suspended" : "user.reinstated",
      entity: userId,
      timestamp: new Date().toISOString(),
    });
  },
  async inviteUser(email, role) {
    await delay();
    M.users.unshift({
      id: `user-${Date.now()}`,
      name: email.split("@")[0],
      email,
      role,
      company: "—",
      status: "Pending",
      lastLogin: "—",
    });
    await notifier.notify({
      title: "User invited",
      body: `${email} invited as ${role}`,
      kind: "success",
      email: { to: email, template: "registration_submitted", data: { name: email } },
    });
  },

  // ── Notifications (Phase 2 §8) ──────────────────────────────────────────
  async listNotifications() {
    await delay();
    return notifications;
  },
  async markNotificationRead(id) {
    await delay();
    const n = notifications.find((x) => x.id === id);
    if (n) n.readAt = new Date().toISOString();
  },
  async markAllNotificationsRead() {
    await delay();
    const now = new Date().toISOString();
    notifications.forEach((n) => {
      if (!n.readAt) n.readAt = now;
    });
  },
  async getNotificationPreferences() {
    await delay();
    return notifPrefs;
  },
  async updateNotificationPreferences(prefs) {
    await delay();
    notifPrefs = prefs;
  },

  // ── Pulse / Rate & Price Intelligence (Phase 2 §5) ──────────────────────
  async listLaneRates() {
    await delay();
    return M.laneRates;
  },
  async listRateBenchmarks() {
    await delay();
    return buildRateBenchmarks(M.laneRates);
  },
  async getRateSubscription() {
    await delay();
    return pulseSub;
  },
  async startPulseCheckout(plan) {
    await delay();
    // Mock: no Stripe — grant entitlement locally so the demo unlocks Pulse.
    pulseSub = {
      status: "active",
      plan,
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
    };
    return { url: null };
  },
  async listPriceAlerts() {
    await delay();
    return priceAlerts;
  },
  async createPriceAlert(input) {
    await delay();
    const alert = {
      id: `alert-${Date.now()}`,
      lane: input.lane,
      mode: input.mode,
      thresholdZAR: input.thresholdZAR,
      direction: input.direction,
      createdAt: new Date().toISOString(),
    };
    priceAlerts.unshift(alert);
    return alert;
  },

  // ── POPIA data-subject rights (Section I) ────────────────────────────────
  async exportMyData() {
    await delay();
    return {
      generatedAt: new Date().toISOString(),
      subject: { id: "demo-user", email: "you@demo", fullName: "You", role: "demand" },
      transactions: M.transactions,
      documents: M.documents,
      invoices: M.invoices,
    };
  },

  async requestErasure(reason) {
    await delay();
    await notifier.notify({
      title: "POPIA erasure request",
      body: reason,
      kind: "warning",
    });
    M.auditEvents.unshift({
      id: `ae-erasure-${Date.now()}`,
      actor: "you@demo",
      action: "popia.erasure_request",
      entity: "self",
      timestamp: new Date().toISOString(),
    });
  },
};

export type MockApi = typeof mockApi;
