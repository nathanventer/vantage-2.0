import * as M from "@/data/mock";
import type { DataService } from "./DataService";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const mockApi: DataService = {
  async listCompanies() { await delay(); return M.companies; },
  async listProviders() { await delay(); return M.providers; },
  async listUsers() { await delay(); return M.users; },
  async listTransactions() { await delay(); return M.transactions; },
  async getTransaction(id: string) {
    await delay();
    return M.transactions.find((t) => t.id === id || t.reference === id) ?? null;
  },
  async listShipmentRequests() { await delay(); return M.shipmentRequests; },
  async listWarehouseJobs() { await delay(); return M.warehouseJobs; },
  async listContainerJobs() { await delay(); return M.containerJobs; },
  async listCargoHandling() { await delay(); return M.cargoHandling; },
  async listTrips() { await delay(); return M.trips; },
  async listDocuments() { await delay(); return M.documents; },
  async listInvoices() { await delay(); return M.invoices; },
  async listPayments() { await delay(); return M.payments; },
  async listComplianceFlags() { await delay(); return M.complianceFlags; },
  async listAuditEvents() { await delay(); return M.auditEvents; },
  async listRegistrations() { await delay(); return M.registrations; },
  async approveCompany(companyId) {
    await delay();
    const r = M.registrations.find((x) => x.id === companyId || x.companyId === companyId);
    if (r) { r.status = "Approved"; r.rejectionReason = undefined; }
  },
  async rejectCompany(companyId, reason) {
    await delay();
    const r = M.registrations.find((x) => x.id === companyId || x.companyId === companyId);
    if (r) { r.status = "Rejected"; r.rejectionReason = reason; }
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
  async dashboardSeries() {
    await delay();
    return { monthlySpend: M.monthlySpend, routeCosts: M.routeCosts };
  },
};

export type MockApi = typeof mockApi;
