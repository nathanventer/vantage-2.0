import { buildDashboardSeriesFromTransactions } from "@/lib/dashboardSeries";
import type {
  AuditEvent,
  CargoHandling,
  Company,
  ComplianceFlag,
  ContainerJob,
  DocumentRecord,
  DocumentStatus,
  DocumentType,
  Invoice,
  InvoiceStatus,
  LaneRate,
  LifecycleStep,
  MacroStage,
  Payment,
  PaymentStatus,
  Provider,
  Registration,
  RegistrationStatus,
  RequestStatus,
  ShipmentEvent,
  ShipmentRequest,
  Transaction,
  TransactionStatus,
  TransportMode,
  Trip,
  TripStatus,
  User,
  WarehouseJob,
  ContainerStatus,
  GovernanceStatus,
  ComplianceStatus,
} from "@/types";
import { STEP_LABELS, macroForStep } from "@/data/mockLifecycle";
import { PHASE1_TEMPLATES } from "@/lib/documents";

export const DEMO_SHIPMENT_COUNT = 125;
export const DEMO_REF_START = 1001;
export const DEMO_REF_END = DEMO_REF_START + DEMO_SHIPMENT_COUNT - 1;

export const COMPANIES_DEMAND = [
  "Ubuntu Retail Imports (Pty) Ltd",
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
];

export const PROVIDERS = [
  "Southern Cross Logistics Solutions",
  "Maersk SA Forwarding",
  "Bidvest Panalpina",
  "Imperial Logistics",
  "Grindrod Freight",
  "Unitrans Africa",
  "DSV South Africa",
  "Transnet Port Terminals",
  "Cargo Compass SA",
];

export const ROUTES: [string, string][] = [
  ["Durban Port", "Johannesburg"],
  ["Cape Town Port", "Stellenbosch"],
  ["Port Elizabeth", "Pretoria"],
  ["Durban Port", "Bloemfontein"],
  ["Cape Town Port", "Johannesburg"],
  ["Richards Bay", "Witbank"],
  ["Durban Port", "Polokwane"],
  ["Cape Town Port", "Kimberley"],
  ["Shanghai", "Durban"],
  ["Shenzhen", "Durban"],
  ["Mumbai", "Durban"],
  ["Singapore", "Durban"],
  ["Hamburg", "Cape Town"],
];

const VESSELS = ["MSC Aurora", "Maersk Cape", "MV Drakensberg", "CMA CGM Tafelberg", "MSC Karoo"];
const CARGOS = [
  "Consumer Electronics",
  "Textiles",
  "Automotive Parts",
  "FMCG Products",
  "Industrial Equipment",
  "Containerised electronics",
  "Refrigerated produce",
  "Bulk maize",
  "Mining equipment",
  "Wine pallets",
  "Steel coils",
];

/** Workbook anchors TXN-1001..1005 — aligned with supabase/seed.sql Phase 1. */
const WORKBOOK = [
  {
    cargo: "Consumer Electronics",
    origin: "Shanghai",
    destination: "Durban",
    final: "Johannesburg DC Warehouse",
    container: "40FT",
    valueZAR: 185_000,
    closed: false,
    currentStep: 11,
    demand: "Ubuntu Retail Imports (Pty) Ltd",
    source: "Southern Cross Logistics Solutions",
  },
  {
    cargo: "Textiles",
    origin: "Shenzhen",
    destination: "Durban",
    final: "Johannesburg DC",
    container: "20FT",
    valueZAR: 98_000,
    closed: false,
    currentStep: 9,
    demand: "Ubuntu Retail Imports (Pty) Ltd",
    source: "Southern Cross Logistics Solutions",
  },
  {
    cargo: "Automotive Parts",
    origin: "Mumbai",
    destination: "Durban",
    final: "Pretoria DC",
    container: "40FT",
    valueZAR: 220_000,
    closed: true,
    currentStep: 16,
    demand: "Ubuntu Retail Imports (Pty) Ltd",
    source: "Southern Cross Logistics Solutions",
  },
  {
    cargo: "FMCG Products",
    origin: "Singapore",
    destination: "Durban",
    final: "Johannesburg DC",
    container: "40FT",
    valueZAR: 145_000,
    closed: false,
    currentStep: 10,
    demand: "Ubuntu Retail Imports (Pty) Ltd",
    source: "Southern Cross Logistics Solutions",
  },
  {
    cargo: "Industrial Equipment",
    origin: "Hamburg",
    destination: "Cape Town",
    final: "Cape Town DC",
    container: "40FT",
    valueZAR: 320_000,
    closed: true,
    currentStep: 16,
    demand: "Ubuntu Retail Imports (Pty) Ltd",
    source: "Southern Cross Logistics Solutions",
  },
] as const;

function rand<T>(arr: readonly T[], i: number): T {
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

/** Canonical DB shipment_status values (11) — mirrored in supabase/seed.sql. */
export const SHIPMENT_DB_STATUSES = [
  "draft",
  "submitted",
  "quoted",
  "approved",
  "in_progress",
  "completed",
  "invoiced",
  "paid",
  "cancelled",
  "disputed",
  "archived",
] as const;

export function txnRef(n: number): string {
  return `TXN-${pad(n)}`;
}

/** Spread created_at across Jan–Dec 2026 (~10 shipments/month). */
export function createdAtForIndex(i: number): string {
  const month = i % 12;
  const day = 1 + ((i * 3) % 27);
  return new Date(2026, month, day, 10 + (i % 6), 0, 0).toISOString();
}

function dbStatusToUi(db: string): TransactionStatus {
  if (["completed", "paid", "archived", "cancelled"].includes(db)) return "Closed";
  if (["in_progress", "invoiced", "disputed"].includes(db)) return "In Progress";
  return "Open";
}

function stepForDbStatus(db: string): number {
  const map: Record<string, number> = {
    draft: 1,
    submitted: 2,
    quoted: 3,
    approved: 4,
    in_progress: 8,
    completed: 16,
    invoiced: 14,
    paid: 15,
    cancelled: 6,
    disputed: 9,
    archived: 16,
  };
  return map[db] ?? 4;
}

function lifecycleSteps(currentStep: number, closed: boolean): LifecycleStep[] {
  if (closed) {
    return STEP_LABELS.map((label, idx) => ({
      index: idx + 1,
      label,
      status: "Completed" as const,
      timestamp: daysAgo(30 - idx),
    }));
  }
  const inProgress = Math.min(Math.max(currentStep, 1), STEP_LABELS.length);
  return STEP_LABELS.map((label, idx) => {
    const index = idx + 1;
    return {
      index,
      label,
      status:
        index < inProgress
          ? ("Completed" as const)
          : index === inProgress
            ? ("In Progress" as const)
            : ("Pending" as const),
      timestamp: index <= inProgress ? daysAgo(25 - idx) : undefined,
    };
  });
}

function shipmentProfile(index: number): {
  closed: boolean;
  currentStep: number;
  status: TransactionStatus;
} {
  if (index < WORKBOOK.length) {
    const w = WORKBOOK[index];
    return {
      closed: w.closed,
      currentStep: w.currentStep,
      status: w.closed ? "Closed" : w.currentStep < 4 ? "Open" : "In Progress",
    };
  }
  if (index < 110) {
    const activeDb = [
      "submitted",
      "quoted",
      "approved",
      "in_progress",
      "in_progress",
      "invoiced",
      "disputed",
    ][index % 7];
    const currentStep = stepForDbStatus(activeDb);
    return { closed: false, currentStep, status: dbStatusToUi(activeDb) };
  }
  const db = SHIPMENT_DB_STATUSES[index % SHIPMENT_DB_STATUSES.length];
  const currentStep = stepForDbStatus(db);
  return {
    closed: dbStatusToUi(db) === "Closed",
    currentStep,
    status: dbStatusToUi(db),
  };
}

export type DemoDataset = ReturnType<typeof buildDemoDataset>;

export function buildDemoDataset() {
  const companies: Company[] = COMPANIES_DEMAND.map((name, i) => ({
    id: `co-${pad(i + 1)}`,
    name,
    category: "Demand",
  }));

  const providers: Provider[] = PROVIDERS.map((name, i) => ({
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

  const companyFk = (name: string) => {
    const id = companyIdByName.get(name);
    if (!id) throw new Error(`Unknown company: ${name}`);
    return id;
  };
  const providerFk = (name: string) => {
    const id = providerIdByName.get(name);
    if (!id) throw new Error(`Unknown provider: ${name}`);
    return id;
  };
  const orgFk = (name: string) => {
    const id = orgIdByName.get(name);
    if (!id) throw new Error(`Unknown organisation: ${name}`);
    return id;
  };

  const USER_SEED: Omit<User, "id" | "companyId">[] = [
    {
      name: "Michael Dlamini",
      email: "buyer@ubuntuimports.com",
      role: "Demand",
      company: "Ubuntu Retail Imports (Pty) Ltd",
      status: "Active",
      lastLogin: "Today, 09:14",
    },
    {
      name: "Sarah Naidoo",
      email: "provider@sclogistics.com",
      role: "Source",
      company: "Southern Cross Logistics Solutions",
      status: "Active",
      lastLogin: "Today, 08:02",
    },
    {
      name: "Platform Admin",
      email: "admin@tradehub.com",
      role: "Admin",
      company: "Vantage Compliance",
      status: "Active",
      lastLogin: "Today, 07:31",
    },
    {
      name: "Jane Pretorius",
      email: "jane@capeimports.co.za",
      role: "Demand",
      company: "Cape Imports (Pty) Ltd",
      status: "Active",
      lastLogin: "Yesterday, 16:48",
    },
    {
      name: "Sipho Khumalo",
      email: "sipho@maersksa.co.za",
      role: "Source",
      company: "Maersk SA Forwarding",
      status: "Active",
      lastLogin: "2 days ago",
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
      lastLogin: "3 days ago",
    },
    {
      name: "Mxolisi Botha",
      email: "mxolisi@karoo.co.za",
      role: "Demand",
      company: "Karoo Commodities",
      status: "Rejected",
      lastLogin: "—",
    },
  ];

  const users: User[] = USER_SEED.map((u, i) => ({
    id: `usr-${pad(i + 1)}`,
    companyId: orgIdByName.get(u.company),
    ...u,
  }));

  const transactions: Transaction[] = Array.from({ length: DEMO_SHIPMENT_COUNT }, (_, i) => {
    const refNum = DEMO_REF_START + i;
    const wb = i < WORKBOOK.length ? WORKBOOK[i] : null;
    const profile = shipmentProfile(i);
    const steps = lifecycleSteps(profile.currentStep, profile.closed);
    const [routeOrigin, routeDest] = wb
      ? ([wb.origin, wb.destination] as [string, string])
      : rand(ROUTES, i);
    const demandCompany = wb?.demand ?? rand(COMPANIES_DEMAND, i);
    const sourceProvider = wb?.source ?? rand(PROVIDERS, i + 1);
    const quoteBase = 95_000 + (i % 17) * 8_500;

    return {
      id: `txn-${pad(i + 1)}`,
      reference: txnRef(refNum),
      demandCompanyId: companyFk(demandCompany),
      demandCompany,
      sourceProviderId: providerFk(sourceProvider),
      sourceProvider,
      origin: routeOrigin,
      destination: routeDest,
      vessel: rand(VESSELS, i),
      containerNo: `MSCU${pad(1_000_000 + i * 137, 7)}`,
      cargo: wb?.cargo ?? rand(CARGOS, i),
      valueZAR: wb?.valueZAR ?? 120_000 + ((i * 47_000) % 3_800_000),
      status: profile.status,
      currentStage: macroForStep(profile.currentStep) as MacroStage,
      createdAt: createdAtForIndex(i),
      steps,
      quotes: PROVIDERS.slice(0, 3).map((p, qi) => ({
        id: `q-${i}-${qi}`,
        providerId: providers[qi % providers.length].id,
        providerName: p,
        priceZAR: quoteBase + qi * 18_500 + (i % 5) * 2_100,
        etaDays: 5 + qi + (i % 4),
        status: qi === 0 && profile.currentStep >= 4 ? ("Accepted" as const) : ("Quoted" as const),
      })),
    };
  });

  const shipmentEvents: ShipmentEvent[] = transactions.flatMap((t) =>
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

  const periods = lastPeriods(12);
  const RATE_MODES: TransportMode[] = ["Sea", "Road"];
  let lrN = 0;
  const laneRates: LaneRate[] = [];
  ROUTES.slice(0, 8).forEach(([origin, destination], li) => {
    RATE_MODES.forEach((mode, mi) => {
      const base = (mode === "Sea" ? 180_000 : 95_000) + li * 12_000;
      periods.forEach((period, pi) => {
        const trend = 1 + pi * 0.012 + Math.sin((pi + li) / 2) * 0.03;
        PROVIDERS.slice(0, 3).forEach((providerName, qi) => {
          lrN += 1;
          const spread = 1 + (qi - 1) * 0.06;
          laneRates.push({
            id: `lr-${lrN}`,
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

  const shipmentRequests: ShipmentRequest[] = Array.from({ length: 90 }, (_, i) => {
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
    "Receive & tally",
    "Quality inspection",
    "Put-away / stage",
    "Release for delivery",
  ];
  const warehouseJobs: WarehouseJob[] = Array.from({ length: 100 }, (_, i) => {
    const done = i % 5;
    const client = rand(COMPANIES_DEMAND, i);
    return {
      id: `wh-${pad(i + 1)}`,
      reference: `WH-${pad(2000 + i)}`,
      warehouseType: (["Bonded", "General", "Clearing", "Cross-docking"] as const)[i % 4],
      clientId: companyFk(client),
      client,
      location: rand(["Durban", "Cape Town", "Johannesburg", "Gqeberha"], i),
      status: done === 4 ? "Completed" : done < 1 ? "Open" : "In Progress",
      checklist: WH_CHECK.map((step, idx) => ({ step, done: idx < done })),
      createdAt: daysAgo(i % 90),
    };
  });

  const containerJobs: ContainerJob[] = Array.from({ length: 110 }, (_, i) => ({
    id: `cn-${pad(i + 1)}`,
    containerNo: `MSCU${pad(2_000_000 + i * 311, 7)}`,
    type: (["Receiving", "Dispatch", "Inspection", "Stuffing", "Destuffing"] as const)[i % 5],
    vessel: rand(VESSELS, i),
    dwellDays: (i * 2) % 14,
    damage: i % 11 === 0,
    status: (["Open", "In Progress", "Completed"] as ContainerStatus[])[i % 3],
    createdAt: daysAgo(i % 90),
  }));

  const CARGO_CONDITION: Record<CargoHandling["operation"], CargoHandling["condition"][]> = {
    "Bulk Handling": ["Good", "Good", "Good", "Pending Inspection"],
    Offloading: ["Good", "Good", "Damaged", "Pending Inspection"],
    Palletising: ["Good", "Good", "Good", "Good"],
    Loading: ["Good", "Good", "Good", "Pending Inspection"],
    Weighbridge: ["Good", "Good", "Good", "Damaged"],
  };
  const cargoHandling: CargoHandling[] = Array.from({ length: 90 }, (_, i) => {
    const operation = (["Bulk Handling", "Palletising", "Weighbridge", "Loading", "Offloading"] as const)[
      i % 5
    ];
    const conditions = CARGO_CONDITION[operation];
    return {
      id: `cg-${pad(i + 1)}`,
      reference: `CG-${pad(3000 + i)}`,
      operation,
      weightKg: 500 + ((i * 1234) % 20_000),
      condition: conditions[i % conditions.length],
      timestamp: daysAgo(i % 90),
    };
  });

  const trips: Trip[] = Array.from({ length: 85 }, (_, i) => {
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
      createdAt: daysAgo(i % 90),
    };
  });

  const DOC_TYPES: DocumentType[] = PHASE1_TEMPLATES.map((t) => t.label);
  const documents: DocumentRecord[] = [];
  let docN = 0;
  for (const t of transactions) {
    const activeStep =
      t.steps.find((s) => s.status === "In Progress")?.index ??
      t.steps.filter((s) => s.status === "Completed").length;
    if (activeStep < 4) continue;
    for (const tmpl of PHASE1_TEMPLATES) {
      docN += 1;
      const uploadedBy = rand([...COMPANIES_DEMAND, ...PROVIDERS], docN);
      documents.push({
        id: `doc-${pad(docN)}`,
        type: tmpl.label,
        transactionRef: t.reference,
        uploadedById: orgFk(uploadedBy),
        uploadedBy,
        uploadedAt: t.createdAt,
        status: (["Draft", "Submitted", "Verified", "Approved"] as DocumentStatus[])[docN % 4],
        signed: docN % 3 !== 0,
        sarsVerified: docN % 4 === 0,
        version: 1 + (docN % 3),
      });
    }
  }

  const invoices: Invoice[] = transactions.slice(0, 95).map((t, i) => ({
    id: `inv-${pad(i + 1)}`,
    number: `INV-${pad(5000 + i)}`,
    transactionRef: t.reference,
    clientId: t.demandCompanyId,
    client: t.demandCompany,
    providerId: t.sourceProviderId,
    provider: t.sourceProvider,
    amountZAR: t.quotes.find((q) => q.status === "Accepted")?.priceZAR ?? 120_000 + i * 3_500,
    issuedAt: t.createdAt,
    dueAt: daysAgo(i - 12),
    status: (["Unpaid", "Paid", "Overdue", "Paid"] as InvoiceStatus[])[i % 4],
  }));

  const payments: Payment[] = invoices.slice(0, 70).map((inv, i) => ({
    id: `pay-${pad(i + 1)}`,
    invoiceNumber: inv.number,
    amountZAR: inv.amountZAR,
    method: (["EFT", "Card", "Letter of Credit"] as const)[i % 3],
    gatewayStatus: (["Verified", "Pending", "Verified"] as PaymentStatus[])[i % 3],
    settledAt: i % 2 === 0 ? daysAgo(i) : undefined,
  }));

  const complianceFlags: ComplianceFlag[] = Array.from({ length: 25 }, (_, i) => {
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

  const auditEvents: AuditEvent[] = Array.from({ length: 50 }, (_, i) => ({
    id: `au-${pad(i + 1)}`,
    actorId: users[i % users.length].id,
    actor: rand(["admin@tradehub.com", "auditor@pulse.com", "system@vantage"], i),
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
    entity: txnRef(DEMO_REF_START + (i % DEMO_SHIPMENT_COUNT)),
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
  const registrations: Registration[] = Array.from({ length: 12 }, (_, i) => {
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
      contactName: rand(["A. Mahlangu", "J. Pretorius", "S. Naidoo", "T. Khumo"], i),
      contactEmail: `contact${i + 1}@example.co.za`,
      submittedAt: daysAgo(i),
      status: (["Under Review", "Approved", "Pending", "Rejected"] as RegistrationStatus[])[i % 4],
      governance: GOV_ITEMS.map((item, idx) => ({
        item,
        status: (["Verified", "Pending", "Failed"] as GovernanceStatus[])[(i + idx) % 3],
      })),
    };
  });

  const series = buildDashboardSeriesFromTransactions(transactions);

  return {
    companies,
    providers,
    users,
    transactions,
    shipmentEvents,
    laneRates,
    shipmentRequests,
    warehouseJobs,
    containerJobs,
    cargoHandling,
    trips,
    documents,
    invoices,
    payments,
    complianceFlags,
    auditEvents,
    registrations,
    monthlySpend: series.monthlySpend,
    routeCosts: series.routeCosts,
  };
}

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

/** Count non-closed shipments — used by demo seed tests. */
export function countActiveTransactions(txs: Transaction[]): number {
  return txs.filter((t) => t.status !== "Closed").length;
}
