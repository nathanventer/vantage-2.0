import type {
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
  LifecycleStep,
  MacroStage,
  ShipmentEvent,
  LaneRate,
  TransportMode,
  DocumentType,
  Company,
  Provider,
  User,
  TransactionStatus,
  RequestStatus,
  ContainerStatus,
  TripStatus,
  DocumentStatus,
  InvoiceStatus,
  PaymentStatus,
  ComplianceStatus,
  RegistrationStatus,
  GovernanceStatus,
} from "@/types";

const COMPANIES_DEMAND = [
  "Cape Imports (Pty) Ltd",
  "Highveld Manufacturing",
  "Karoo Commodities",
  "Sandton Retail Group",
  "Durban Steel Co",
  "Boland Wine Exports",
  "Phakama Mining",
  "Umhlanga Traders",
  "Free State Agri",
  "Bloemfontein Foods",
  "Tshwane Pharma",
  "Garden Route Logistics Demand",
];
const PROVIDERS = [
  "Maersk SA Forwarding",
  "Bidvest Panalpina",
  "Imperial Logistics",
  "Grindrod Freight",
  "Unitrans Africa",
  "DSV South Africa",
  "Transnet Port Terminals",
  "Cargo Compass SA",
  "DP World Maydon Wharf",
];
const ROUTES = [
  ["Durban Port", "Johannesburg"],
  ["Cape Town Port", "Stellenbosch"],
  ["Port Elizabeth", "Pretoria"],
  ["Durban Port", "Bloemfontein"],
  ["Cape Town Port", "Johannesburg"],
  ["Richards Bay", "Witbank"],
  ["Durban Port", "Polokwane"],
  ["Cape Town Port", "Kimberley"],
];
const VESSELS = ["MSC Aurora", "Maersk Cape", "MV Drakensberg", "CMA CGM Tafelberg", "MSC Karoo"];
const CARGOS = [
  "Containerised electronics",
  "Refrigerated produce",
  "Bulk maize",
  "Automotive parts",
  "Textiles",
  "Mining equipment",
  "Wine pallets",
  "Steel coils",
];

export const STEP_LABELS = [
  "Shipment request created",
  "Providers matched",
  "Quotes / acceptance",
  "Provider confirmed",
  "Transaction record created",
  "Service agreement generated",
  "Documentation uploaded",
  "Cargo collection",
  "Port & customs processing",
  "Warehouse operations",
  "Transport scheduling",
  "Final delivery",
  "POD uploaded",
  "Invoice generated",
  "Payment processed",
  "Transaction closed",
];

/** Build the canonical 16 lifecycle steps for a given 1-based current step. */
export function makeLifecycleSteps(currentStep: number): LifecycleStep[] {
  const done = currentStep - 1;
  return STEP_LABELS.map((label, idx) => ({
    index: idx + 1,
    label,
    status: idx < done ? "Completed" : idx === done ? "In Progress" : "Pending",
  }));
}

const MACRO_STAGES: MacroStage[] = [
  "Vessel",
  "Port",
  "Clearing",
  "Transport",
  "Warehouse",
  "Delivery",
];

/** Map a 1–16 lifecycle step onto its macro stage (even 6-way split). */
export function macroForStep(step: number): MacroStage {
  const idx = Math.min(5, Math.max(0, Math.floor(((step - 1) / 16) * 6)));
  return MACRO_STAGES[idx];
}

/** Current 1-based step for a shipment: the In-Progress step, else completed+1. */
export function currentStepOf(steps: LifecycleStep[]): number {
  const inProgress = steps.find((s) => s.status === "In Progress");
  if (inProgress) return inProgress.index;
  const completed = steps.filter((s) => s.status === "Completed").length;
  return Math.min(STEP_LABELS.length, completed + 1);
}

function rand<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function pad(n: number, w = 4) {
  return n.toString().padStart(w, "0");
}
function daysAgo(d: number) {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString();
}

/* ── Organisation master lists (stable ids) ────────────────────────────── */
export const companies: Company[] = COMPANIES_DEMAND.map((name, i) => ({
  id: `co-${pad(i + 1)}`,
  name,
  category: "Demand",
}));

export const providers: Provider[] = PROVIDERS.map((name, i) => ({
  id: `pv-${pad(i + 1, 3)}`,
  name,
  category: "Source",
}));

const companyIdByName = new Map(companies.map((c) => [c.name, c.id]));
const providerIdByName = new Map(providers.map((p) => [p.name, p.id]));
const orgIdByName = new Map<string, string>([
  ...companies.map((c) => [c.name, c.id] as const),
  ...providers.map((p) => [p.name, p.id] as const),
]);

/** FK resolvers — throw on an unknown name so generators can't silently dangle. */
function companyFk(name: string): string {
  const id = companyIdByName.get(name);
  if (!id) throw new Error(`Unknown company: ${name}`);
  return id;
}
function providerFk(name: string): string {
  const id = providerIdByName.get(name);
  if (!id) throw new Error(`Unknown provider: ${name}`);
  return id;
}
function orgFk(name: string): string {
  const id = orgIdByName.get(name);
  if (!id) throw new Error(`Unknown organisation: ${name}`);
  return id;
}

/* ── Platform user / profile directory ─────────────────────────────────── */
const USER_SEED: Omit<User, "id" | "companyId">[] = [
  {
    name: "Jane Pretorius",
    email: "jane@capeimports.co.za",
    role: "Demand",
    company: "Cape Imports (Pty) Ltd",
    status: "Active",
    lastLogin: "Today, 09:14",
  },
  {
    name: "Sipho Khumalo",
    email: "sipho@maersksa.co.za",
    role: "Source",
    company: "Maersk SA Forwarding",
    status: "Active",
    lastLogin: "Today, 08:02",
  },
  {
    name: "Andile Mahlangu",
    email: "andile@bidvest.co.za",
    role: "Source",
    company: "Bidvest Panalpina",
    status: "Active",
    lastLogin: "Yesterday, 16:48",
  },
  {
    name: "Thandi Naidoo",
    email: "thandi@vantage.co.za",
    role: "Admin",
    company: "Vantage Compliance",
    status: "Active",
    lastLogin: "Today, 07:31",
  },
  {
    name: "Pieter van der Merwe",
    email: "pvdm@highveld.co.za",
    role: "Demand",
    company: "Highveld Manufacturing",
    status: "Pending",
    lastLogin: "—",
  },
  {
    name: "Lerato Dlamini",
    email: "lerato@grindrod.co.za",
    role: "Source",
    company: "Grindrod Freight",
    status: "Active",
    lastLogin: "2 days ago",
  },
  {
    name: "Mxolisi Botha",
    email: "mxolisi@karoo.co.za",
    role: "Demand",
    company: "Karoo Commodities",
    status: "Rejected",
    lastLogin: "—",
  },
  {
    name: "Nokuthula Zulu",
    email: "nokuthula@unitrans.co.za",
    role: "Source",
    company: "Unitrans Africa",
    status: "Active",
    lastLogin: "5 days ago",
  },
];
export const users: User[] = USER_SEED.map((u, i) => ({
  id: `usr-${pad(i + 1)}`,
  companyId: orgIdByName.get(u.company),
  ...u,
}));

export const transactions: Transaction[] = Array.from({ length: 24 }, (_, i) => {
  const [origin, destination] = rand(ROUTES, i);
  const demandCompany = rand(COMPANIES_DEMAND, i);
  const sourceProvider = rand(PROVIDERS, i + 1);
  const completedSteps = i % 16;
  const steps: LifecycleStep[] = STEP_LABELS.map((label, idx) => ({
    index: idx + 1,
    label,
    status: idx < completedSteps ? "Completed" : idx === completedSteps ? "In Progress" : "Pending",
    timestamp: idx <= completedSteps ? daysAgo(20 - idx) : undefined,
  }));
  const status: TransactionStatus =
    completedSteps === 15 ? "Closed" : completedSteps < 4 ? "Open" : "In Progress";
  return {
    id: `txn-${pad(i + 1)}`,
    reference: `VTG-TXN-${pad(1000 + i)}`,
    demandCompanyId: companyFk(demandCompany),
    demandCompany,
    sourceProviderId: providerFk(sourceProvider),
    sourceProvider,
    origin,
    destination,
    vessel: rand(VESSELS, i),
    containerNo: `MSCU${pad(1000000 + i * 137, 7)}`,
    cargo: rand(CARGOS, i),
    valueZAR: 150000 + ((i * 47000) % 4_000_000),
    status,
    currentStage: rand(MACRO_STAGES, Math.floor(completedSteps / 3)),
    createdAt: daysAgo(30 - i),
    steps,
    quotes: PROVIDERS.slice(0, 3).map((p, qi) => ({
      id: `q-${i}-${qi}`,
      providerId: providers[qi].id,
      providerName: p,
      priceZAR: 100000 + qi * 25000 + i * 1500,
      etaDays: 5 + qi + (i % 4),
      status: qi === 0 && completedSteps >= 3 ? "Accepted" : "Quoted",
    })),
  };
});

/** Ops event stream (mutable). Seeded with the completed milestones per shipment. */
export const shipmentEvents: ShipmentEvent[] = transactions.flatMap((t) =>
  t.steps
    .filter((s) => s.status === "Completed")
    .map((s) => ({
      id: `evt-${t.id}-${s.index}`,
      shipmentId: t.id,
      reference: t.reference,
      eventType: "step_advanced" as const,
      step: s.index,
      note: s.label,
      actor: "system@vantage",
      createdAt: s.timestamp ?? t.createdAt,
    })),
);

/* ── Pulse / Rate Intelligence: observed lane rates (Phase 2 §5) ─────────── */
function lastPeriods(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const RATE_MODES: TransportMode[] = ["Sea", "Road"];
const RATE_PROVIDERS = PROVIDERS.slice(0, 3);

export const laneRates: LaneRate[] = (() => {
  const periods = lastPeriods(12);
  const rows: LaneRate[] = [];
  let n = 0;
  ROUTES.slice(0, 6).forEach(([origin, destination], li) => {
    RATE_MODES.forEach((mode, mi) => {
      const base = (mode === "Sea" ? 180000 : 95000) + li * 12000;
      periods.forEach((period, pi) => {
        // Gentle upward trend + seasonal wobble, deterministic.
        const trend = 1 + pi * 0.012 + Math.sin((pi + li) / 2) * 0.03;
        RATE_PROVIDERS.forEach((providerName, qi) => {
          n += 1;
          const spread = 1 + (qi - 1) * 0.06;
          rows.push({
            id: `lr-${n}`,
            origin,
            destination,
            mode,
            period,
            providerName,
            priceZAR: Math.round(base * trend * spread),
            transitDays: (mode === "Sea" ? 18 : 4) + qi + (mi % 2),
          });
        });
      });
    });
  });
  return rows;
})();

export const shipmentRequests: ShipmentRequest[] = Array.from({ length: 18 }, (_, i) => {
  const demandCompany = rand(COMPANIES_DEMAND, i);
  return {
    id: `req-${pad(i + 1)}`,
    demandCompanyId: companyFk(demandCompany),
    demandCompany,
    origin: rand(ROUTES, i)[0],
    destination: rand(ROUTES, i)[1],
    cargo: rand(CARGOS, i),
    weightTons: 4 + ((i * 3) % 28),
    requestedAt: daysAgo(i),
    status: (["Open", "Quoted", "Accepted", "Confirmed"] as RequestStatus[])[i % 4],
  };
});

const WH_CHECK = [
  "Cargo received",
  "Container inspection",
  "Destuffing",
  "Palletising",
  "Inventory allocated",
  "Storage location assigned",
  "Dispatch scheduled",
  "Transport handover",
];
export const warehouseJobs: WarehouseJob[] = Array.from({ length: 20 }, (_, i) => {
  const done = i % 8;
  const client = rand(COMPANIES_DEMAND, i);
  return {
    id: `wh-${pad(i + 1)}`,
    reference: `WH-${pad(2000 + i)}`,
    warehouseType: (["Bonded", "General", "Clearing", "Cross-docking"] as const)[i % 4],
    clientId: companyFk(client),
    client,
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
  status: (["Open", "In Progress", "Completed"] as ContainerStatus[])[i % 3],
}));

export const cargoHandling: CargoHandling[] = Array.from({ length: 18 }, (_, i) => ({
  id: `cg-${pad(i + 1)}`,
  reference: `CG-${pad(3000 + i)}`,
  operation: (["Bulk Handling", "Palletising", "Weighbridge", "Loading", "Offloading"] as const)[
    i % 5
  ],
  weightKg: 500 + ((i * 1234) % 20000),
  condition: (["Good", "Good", "Pending Inspection", "Damaged"] as const)[i % 4],
  timestamp: daysAgo(i),
}));

export const trips: Trip[] = Array.from({ length: 16 }, (_, i) => {
  const [origin, destination] = rand(ROUTES, i);
  return {
    id: `tp-${pad(i + 1)}`,
    reference: `TR-${pad(4000 + i)}`,
    vehicle: `ZN ${pad(1000 + i * 7)} GP`,
    driver: rand(
      ["S. Khumalo", "P. van der Merwe", "T. Mokoena", "L. Naidoo", "M. Botha", "N. Dlamini"],
      i,
    ),
    origin,
    destination,
    status: (["Scheduled", "In Transit", "Delivered"] as TripStatus[])[i % 3],
    progressPct: (i * 23) % 100,
    podUploaded: i % 3 === 2,
    lat: -29.85 + ((i * 0.13) % 3),
    lng: 30.98 - ((i * 0.21) % 5),
  };
});

const DOC_TYPES: DocumentType[] = [
  "Purchase Order",
  "Commercial Invoice",
  "Bill of Lading",
  "Customs Declaration",
  "Delivery Note",
  "Warehouse Receipt",
  "Transport Manifest",
  "Proof of Delivery",
  "SARS Clearing Document",
  "Proof of Service Completion",
  "Proof of Payment",
  "Transaction Summary",
];
export const documents: DocumentRecord[] = Array.from({ length: 30 }, (_, i) => {
  const uploadedBy = rand([...COMPANIES_DEMAND, ...PROVIDERS], i);
  return {
    id: `doc-${pad(i + 1)}`,
    type: DOC_TYPES[i % DOC_TYPES.length],
    transactionRef: `VTG-TXN-${pad(1000 + (i % 24))}`,
    uploadedById: orgFk(uploadedBy),
    uploadedBy,
    uploadedAt: daysAgo(i),
    status: (["Draft", "Submitted", "Verified", "Approved"] as DocumentStatus[])[i % 4],
    signed: i % 3 !== 0,
    sarsVerified: i % 4 === 0,
    version: 1 + (i % 3),
  };
});

export const invoices: Invoice[] = Array.from({ length: 22 }, (_, i) => {
  const client = rand(COMPANIES_DEMAND, i);
  const provider = rand(PROVIDERS, i);
  return {
    id: `inv-${pad(i + 1)}`,
    number: `INV-${pad(5000 + i)}`,
    transactionRef: `VTG-TXN-${pad(1000 + (i % 24))}`,
    clientId: companyFk(client),
    client,
    providerId: providerFk(provider),
    provider,
    amountZAR: 80000 + ((i * 19000) % 900000),
    issuedAt: daysAgo(i + 1),
    dueAt: daysAgo(i - 14),
    status: (["Unpaid", "Paid", "Overdue", "Paid"] as InvoiceStatus[])[i % 4],
  };
});

export const payments: Payment[] = invoices.slice(0, 16).map((inv, i) => ({
  id: `pay-${pad(i + 1)}`,
  invoiceNumber: inv.number,
  amountZAR: inv.amountZAR,
  method: (["EFT", "Card", "Letter of Credit"] as const)[i % 3],
  gatewayStatus: (["Verified", "Pending", "Verified"] as PaymentStatus[])[i % 3],
  settledAt: i % 2 === 0 ? daysAgo(i) : undefined,
}));

export const complianceFlags: ComplianceFlag[] = Array.from({ length: 15 }, (_, i) => {
  const entity = rand([...COMPANIES_DEMAND, ...PROVIDERS], i);
  return {
    id: `cf-${pad(i + 1)}`,
    entityId: orgFk(entity),
    entity,
    area: (["SARS", "Customs", "Documentation", "Transport", "Environmental", "SOP"] as const)[
      i % 6
    ],
    severity: (["Low", "Medium", "High"] as const)[i % 3],
    status: (["Open", "Under Review", "Closed"] as ComplianceStatus[])[i % 3],
    notedAt: daysAgo(i),
  };
});

export const auditEvents: AuditEvent[] = Array.from({ length: 30 }, (_, i) => ({
  id: `au-${pad(i + 1)}`,
  actorId: users[i % users.length].id,
  actor: rand(["admin@vantage", "compliance@vantage", "system"], i),
  action: rand(
    [
      "Approved registration",
      "Rejected document",
      "Updated RBAC role",
      "Verified SARS document",
      "Closed transaction",
      "Generated invoice",
      "Flagged compliance issue",
    ],
    i,
  ),
  entity: `VTG-${pad(1000 + i)}`,
  timestamp: daysAgo(i),
}));

const GOV_ITEMS = [
  "Company registration (CIPC)",
  "Tax clearance",
  "Banking verification",
  "Director ID verification",
  "SARS registration",
  "Insurance certificate",
  "Operating licences",
  "B-BBEE certificate",
];
export const registrations: Registration[] = Array.from({ length: 12 }, (_, i) => {
  const company = rand([...COMPANIES_DEMAND, ...PROVIDERS], i);
  return {
    id: `reg-${pad(i + 1)}`,
    companyId: orgFk(company),
    company,
    category: i % 2 === 0 ? "Demand" : "Source",
    subType: rand(
      [
        "Importer",
        "Exporter",
        "Manufacturer",
        "Freight Forwarder",
        "Clearing Agent",
        "Warehouse Operator",
        "Transport Co.",
      ],
      i,
    ),
    contactName: rand(["A. Mahlangu", "J. Pretorius", "S. Naidoo", "T. Khumalo"], i),
    contactEmail: `contact${i + 1}@example.co.za`,
    submittedAt: daysAgo(i),
    status: (["Under Review", "Approved", "Pending", "Rejected"] as RegistrationStatus[])[i % 4],
    governance: GOV_ITEMS.map((item, idx) => ({
      item,
      status: (["Verified", "Pending", "Failed"] as GovernanceStatus[])[(i + idx) % 3],
    })),
  };
});

export const monthlySpend = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  spendZAR: 1_200_000 + ((i * 280000) % 3_500_000),
  shipments: 12 + ((i * 5) % 40),
}));

export const routeCosts = ROUTES.map(([from, to], i) => ({
  route: `${from} → ${to}`,
  costZAR: 80000 + ((i * 22000) % 200000),
}));
