/**
 * Mock data facade — canonical TradeHub demo dataset (125 shipments) lives in
 * demoDataset.ts; this module re-exports it for mockApi and legacy imports.
 */
export { STEP_LABELS, makeLifecycleSteps, macroForStep, currentStepOf } from "@/data/mockLifecycle";

export {
  DEMO_SHIPMENT_COUNT,
  DEMO_REF_START,
  DEMO_REF_END,
  COMPANIES_DEMAND,
  PROVIDERS,
  ROUTES,
  buildDemoDataset,
  countActiveTransactions,
} from "@/data/demoDataset";

import { buildDemoDataset } from "@/data/demoDataset";

const demo = buildDemoDataset();

export const companies = demo.companies;
export const providers = demo.providers;
export const users = demo.users;
export const transactions = demo.transactions;
export const shipmentEvents = demo.shipmentEvents;
export const laneRates = demo.laneRates;
export const shipmentRequests = demo.shipmentRequests;
export const warehouseJobs = demo.warehouseJobs;
export const containerJobs = demo.containerJobs;
export const cargoHandling = demo.cargoHandling;
export const trips = demo.trips;
export const documents = demo.documents;
export const invoices = demo.invoices;
export const payments = demo.payments;
export const complianceFlags = demo.complianceFlags;
export const auditEvents = demo.auditEvents;
export const registrations = demo.registrations;
export const monthlySpend = demo.monthlySpend;
export const routeCosts = demo.routeCosts;
