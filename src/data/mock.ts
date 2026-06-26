import type {
  Transaction, ShipmentRequest, WarehouseJob, ContainerJob, CargoHandling,
  Trip, DocumentRecord, Invoice, Payment, ComplianceFlag, AuditEvent,
  Registration, LifecycleStep, MacroStage, DocumentType, StatusLabel,
} from "@/types";

const COMPANIES_DEMAND = [
  "Cape Imports (Pty) Ltd", "Highveld Manufacturing", "Karoo Commodities",
  "Sandton Retail Group", "Durban Steel Co", "Boland Wine Exports",
  "Phakama Mining", "Umhlanga Traders", "Free State Agri", "Bloemfontein Foods",
  "Tshwane Pharma", "Garden Route Logistics Demand",
];
const PROVIDERS = [
  "Maersk SA Forwarding", "Bidvest Panalpina", "Imperial Logistics",
  "Grindrod Freight", "Unitrans Africa", "DSV South Africa",
  "Transnet Port Terminals", "Cargo Compass SA", "DP World Maydon Wharf",
];
const ROUTES = [
  ["Durban Port", "Johannesburg"], ["Cape Town Port", "Stellenbosch"],
  ["Port Elizabeth", "Pretoria"], ["Durban Port", "Bloemfontein"],
  ["Cape Town Port", "Johannesburg"], ["Richards Bay", "Witbank"],
  ["Durban Port", "Polokwane"], ["Cape Town Port", "Kimberley"],
];
const VESSELS = ["MSC Aurora", "Maersk Cape", "MV Drakensberg", "CMA CGM Tafelberg", "MSC Karoo"];
const CARGOS = ["Containerised electronics", "Refrigerated produce", "Bulk maize",
  "Automotive parts", "Textiles", "Mining equipment", "Wine pallets", "Steel coils"];

const STEP_LABELS = [
  "Shipment request created", "Providers matched", "Quotes / acceptance",
  "Provider confirmed", "Transaction record created", "Service agreement generated",
  "Documentation uploaded", "Cargo collection", "Port & customs processing",
  "Warehouse operations", "Transport scheduling", "Final delivery",
  "POD uploaded", "Invoice generated", "Payment processed", "Transaction closed",
];

const MACRO_STAGES: MacroStage[] = ["Vessel", "Port", "Clearing", "Transport", "Warehouse", "Delivery"];

function rand<T>(arr: T[], i: number): T { return arr[i % arr.length]; }
function pad(n: number, w = 4) { return n.toString().padStart(w, "0"); }
function daysAgo(d: number) {
  const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString();
}

export const transactions: Transaction[] = Array.from({ length: 24 }, (_, i) => {
  const [origin, destination] = rand(ROUTES, i);
  const completedSteps = (i % 16);
  const steps: LifecycleStep[] = STEP_LABELS.map((label, idx) => ({
    index: idx + 1,
    label,
    status: idx < completedSteps ? "Completed" : idx === completedSteps ? "In Progress" : "Pending",
    timestamp: idx <= completedSteps ? daysAgo(20 - idx) : undefined,
  }));
  const status: StatusLabel = completedSteps === 15 ? "Closed" : completedSteps < 4 ? "Open" : "In Progress";
  return {
    id: `txn-${pad(i + 1)}`,
    reference: `VTG-TXN-${pad(1000 + i)}`,
    demandCompany: rand(COMPANIES_DEMAND, i),
    sourceProvider: rand(PROVIDERS, i + 1),
    origin, destination,
    vessel: rand(VESSELS, i),
    containerNo: `MSCU${pad(1000000 + i * 137, 7)}`,
    cargo: rand(CARGOS, i),
    valueZAR: 150000 + (i * 47000) % 4_000_000,
    status,
    currentStage: rand(MACRO_STAGES, Math.floor(completedSteps / 3)),
    createdAt: daysAgo(30 - i),
    steps,
    quotes: PROVIDERS.slice(0, 3).map((p, qi) => ({
      id: `q-${i}-${qi}`,
      providerId: `prov-${qi}`,
      providerName: p,
      priceZAR: 100000 + qi * 25000 + i * 1500,
      etaDays: 5 + qi + (i % 4),
      status: qi === 0 && completedSteps >= 3 ? "Accepted" : "Quoted",
    })),
  };
});

export const shipmentRequests: ShipmentRequest[] = Array.from({ length: 18 }, (_, i) => ({
  id: `req-${pad(i + 1)}`,
  demandCompany: rand(COMPANIES_DEMAND, i),
  origin: rand(ROUTES, i)[0],
  destination: rand(ROUTES, i)[1],
  cargo: rand(CARGOS, i),
  weightTons: 4 + (i * 3) % 28,
  requestedAt: daysAgo(i),
  status: (["Open", "Quoted", "Accepted", "Confirmed"] as StatusLabel[])[i % 4],
}));

const WH_CHECK = [
  "Cargo received", "Container inspection", "Destuffing", "Palletising",
  "Inventory allocated", "Storage location assigned", "Dispatch scheduled", "Transport handover",
];
export const warehouseJobs: WarehouseJob[] = Array.from({ length: 20 }, (_, i) => {
  const done = i % 8;
  return {
    id: `wh-${pad(i + 1)}`,
    reference: `WH-${pad(2000 + i)}`,
    warehouseType: (["Bonded", "General", "Clearing", "Cross-docking"] as const)[i % 4],
    client: rand(COMPANIES_DEMAND, i),
    location: rand(["Durban", "Cape Town", "Johannesburg", "Gqeberha"], i),
    status: done === 7 ? "Completed" : done < 2 ? "Open" : "In Progress",
    checklist: WH_CHECK.map((step, idx) => ({ step, done: idx < done })),
  };
});

export const containerJobs: ContainerJob[] = Array.from({ length: 22 }, (_, i) => ({
  id: `cn-${pad(i + 1)}`,
  containerNo: `MSCU${pad(2000000 + i * 311, 7)}`,
  type: (["Receiving", "Dispatch", "Inspection", "Stuffing", "Destuffing"] as const)[i % 5],
  vessel: rand(VESSELS, i),
  dwellDays: (i * 2) % 14,
  damage: i % 7 === 0,
  status: (["Open", "In Progress", "Completed"] as StatusLabel[])[i % 3],
}));

export const cargoHandling: CargoHandling[] = Array.from({ length: 18 }, (_, i) => ({
  id: `cg-${pad(i + 1)}`,
  reference: `CG-${pad(3000 + i)}`,
  operation: (["Bulk Handling", "Palletising", "Weighbridge", "Loading", "Offloading"] as const)[i % 5],
  weightKg: 500 + (i * 1234) % 20000,
  condition: (["Good", "Good", "Pending Inspection", "Damaged"] as const)[i % 4],
  timestamp: daysAgo(i),
}));

export const trips: Trip[] = Array.from({ length: 16 }, (_, i) => {
  const [origin, destination] = rand(ROUTES, i);
  return {
    id: `tp-${pad(i + 1)}`,
    reference: `TR-${pad(4000 + i)}`,
    vehicle: `ZN ${pad(1000 + i * 7)} GP`,
    driver: rand(["S. Khumalo", "P. van der Merwe", "T. Mokoena", "L. Naidoo", "M. Botha", "N. Dlamini"], i),
    origin, destination,
    status: (["Scheduled", "In Transit", "Delivered"] as StatusLabel[])[i % 3],
    progressPct: ((i * 23) % 100),
    podUploaded: i % 3 === 2,
    lat: -29.85 + (i * 0.13) % 3,
    lng: 30.98 - (i * 0.21) % 5,
  };
});

const DOC_TYPES: DocumentType[] = [
  "Purchase Order", "Commercial Invoice", "Bill of Lading", "Customs Declaration",
  "Delivery Note", "Warehouse Receipt", "Transport Manifest", "Proof of Delivery",
  "SARS Clearing Document", "Proof of Service Completion", "Proof of Payment", "Transaction Summary",
];
export const documents: DocumentRecord[] = Array.from({ length: 30 }, (_, i) => ({
  id: `doc-${pad(i + 1)}`,
  type: DOC_TYPES[i % DOC_TYPES.length],
  transactionRef: `VTG-TXN-${pad(1000 + (i % 24))}`,
  uploadedBy: rand([...COMPANIES_DEMAND, ...PROVIDERS], i),
  uploadedAt: daysAgo(i),
  status: (["Draft", "Submitted", "Verified", "Approved"] as StatusLabel[])[i % 4],
  signed: i % 3 !== 0,
  sarsVerified: i % 4 === 0,
  version: 1 + (i % 3),
}));

export const invoices: Invoice[] = Array.from({ length: 22 }, (_, i) => ({
  id: `inv-${pad(i + 1)}`,
  number: `INV-${pad(5000 + i)}`,
  transactionRef: `VTG-TXN-${pad(1000 + (i % 24))}`,
  client: rand(COMPANIES_DEMAND, i),
  provider: rand(PROVIDERS, i),
  amountZAR: 80000 + (i * 19000) % 900000,
  issuedAt: daysAgo(i + 1),
  dueAt: daysAgo(i - 14),
  status: (["Unpaid", "Paid", "Overdue", "Paid"] as StatusLabel[])[i % 4],
}));

export const payments: Payment[] = invoices.slice(0, 16).map((inv, i) => ({
  id: `pay-${pad(i + 1)}`,
  invoiceNumber: inv.number,
  amountZAR: inv.amountZAR,
  method: (["EFT", "Card", "Letter of Credit"] as const)[i % 3],
  gatewayStatus: (["Verified", "Pending", "Verified"] as StatusLabel[])[i % 3],
  settledAt: i % 2 === 0 ? daysAgo(i) : undefined,
}));

export const complianceFlags: ComplianceFlag[] = Array.from({ length: 15 }, (_, i) => ({
  id: `cf-${pad(i + 1)}`,
  entity: rand([...COMPANIES_DEMAND, ...PROVIDERS], i),
  area: (["SARS", "Customs", "Documentation", "Transport", "Environmental", "SOP"] as const)[i % 6],
  severity: (["Low", "Medium", "High"] as const)[i % 3],
  status: (["Open", "Under Review", "Closed"] as StatusLabel[])[i % 3],
  notedAt: daysAgo(i),
}));

export const auditEvents: AuditEvent[] = Array.from({ length: 30 }, (_, i) => ({
  id: `au-${pad(i + 1)}`,
  actor: rand(["admin@vantage", "compliance@vantage", "system"], i),
  action: rand([
    "Approved registration", "Rejected document", "Updated RBAC role",
    "Verified SARS document", "Closed transaction", "Generated invoice",
    "Flagged compliance issue",
  ], i),
  entity: `VTG-${pad(1000 + i)}`,
  timestamp: daysAgo(i),
}));

const GOV_ITEMS = [
  "Company registration (CIPC)", "Tax clearance", "Banking verification",
  "Director ID verification", "SARS registration", "Insurance certificate",
  "Operating licences", "B-BBEE certificate",
];
export const registrations: Registration[] = Array.from({ length: 12 }, (_, i) => ({
  id: `reg-${pad(i + 1)}`,
  company: rand([...COMPANIES_DEMAND, ...PROVIDERS], i),
  category: i % 2 === 0 ? "Demand" : "Source",
  subType: rand(["Importer", "Exporter", "Manufacturer", "Freight Forwarder", "Clearing Agent", "Warehouse Operator", "Transport Co."], i),
  contactName: rand(["A. Mahlangu", "J. Pretorius", "S. Naidoo", "T. Khumalo"], i),
  contactEmail: `contact${i + 1}@example.co.za`,
  submittedAt: daysAgo(i),
  status: (["Under Review", "Approved", "Pending", "Rejected"] as StatusLabel[])[i % 4],
  governance: GOV_ITEMS.map((item, idx) => ({
    item,
    status: ((["Verified", "Pending", "Failed"] as StatusLabel[])[(i + idx) % 3]),
  })),
}));

export const monthlySpend = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  spend: 1_200_000 + (i * 280000) % 3_500_000,
  shipments: 12 + (i * 5) % 40,
}));

export const routeCosts = ROUTES.map(([from, to], i) => ({
  route: `${from} → ${to}`,
  cost: 80000 + (i * 22000) % 200000,
}));
