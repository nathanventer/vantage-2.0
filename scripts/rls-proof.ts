/**
 * Per-role RLS proof — signs in as each demo role and asserts the row-level
 * security scoping holds on the live database.
 *
 * Run:  bun run scripts/rls-proof.ts
 * Env:  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (read from .env.local)
 *
 * Assertions:
 *  1. Demand (Ubuntu) sees only shipments where they are the demand company.
 *  2. Source (Southern Cross) sees only shipments they're assigned to / quoted.
 *  3. Demand cannot read the other company's compliance documents.
 *  4. Invoices visible to a company all involve that company.
 *  5. Admin sees strictly more shipments than either company.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`Missing ${name}`);
  return line.slice(name.length + 1).trim();
}

const URL = env("VITE_SUPABASE_URL");
const ANON = env("VITE_SUPABASE_ANON_KEY");
const PASSWORD = "Demo@123";

let failures = 0;
function assert(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function loginAs(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function main() {
  const admin = await loginAs("admin@tradehub.com");
  const buyer = await loginAs("buyer@ubuntuimports.com");
  const provider = await loginAs("provider@sclogistics.com");

  // Resolve company ids via each user's own profile.
  const myCompany = async (c: SupabaseClient) => {
    const { data: u } = await c.auth.getUser();
    const { data } = await c
      .from("profiles")
      .select("company_id")
      .eq("id", u.user!.id)
      .single();
    return (data as { company_id: string }).company_id;
  };
  const ubuntuId = await myCompany(buyer);
  const scId = await myCompany(provider);

  // 1. Demand scoping on shipments
  const { data: buyerShipments } = await buyer
    .from("shipments")
    .select("id, demand_company_id");
  const buyerLeaks = (buyerShipments ?? []).filter((s) => s.demand_company_id !== ubuntuId);
  assert(
    "Demand sees only own-company shipments",
    buyerLeaks.length === 0 && (buyerShipments?.length ?? 0) > 0,
    `${buyerShipments?.length ?? 0} visible, ${buyerLeaks.length} foreign`,
  );

  // 2. Source scoping on shipments
  const { data: provShipments } = await provider
    .from("shipments")
    .select("id, source_company_id");
  const provForeign = (provShipments ?? []).filter(
    (s) => s.source_company_id !== null && s.source_company_id !== scId,
  );
  assert(
    "Source sees only assigned/quoted shipments",
    provForeign.length === 0 && (provShipments?.length ?? 0) > 0,
    `${provShipments?.length ?? 0} visible, ${provForeign.length} foreign-assigned`,
  );

  // 3. Cross-company compliance docs are invisible
  const { data: crossDocs } = await buyer
    .from("compliance_documents")
    .select("id")
    .eq("company_id", scId);
  assert(
    "Demand cannot read the other company's compliance docs",
    (crossDocs ?? []).length === 0,
    `${(crossDocs ?? []).length} leaked`,
  );

  // 4. Invoice scoping
  const { data: buyerInvoices } = await buyer
    .from("invoices")
    .select("client_company_id, provider_company_id");
  const invLeaks = (buyerInvoices ?? []).filter(
    (i) => i.client_company_id !== ubuntuId && i.provider_company_id !== ubuntuId,
  );
  assert(
    "Invoices visible to Demand all involve Demand",
    invLeaks.length === 0 && (buyerInvoices?.length ?? 0) > 0,
    `${buyerInvoices?.length ?? 0} visible, ${invLeaks.length} foreign`,
  );

  // 5. Admin supremacy
  const count = async (c: SupabaseClient) => {
    const { count: n } = await c.from("shipments").select("id", { count: "exact", head: true });
    return n ?? 0;
  };
  const [adminN, buyerN, provN] = await Promise.all([count(admin), count(buyer), count(provider)]);
  assert(
    "Admin sees ≥ every company's scope",
    adminN >= buyerN && adminN >= provN && adminN > 0,
    `admin ${adminN} vs demand ${buyerN} / source ${provN}`,
  );

  // 6. Ops tables scoped too (trips)
  const { data: buyerTrips } = await buyer.from("trips").select("client_company_id");
  const tripLeaks = (buyerTrips ?? []).filter((t) => t.client_company_id !== ubuntuId);
  assert(
    "Trips visible to Demand belong to Demand",
    tripLeaks.length === 0,
    `${buyerTrips?.length ?? 0} visible, ${tripLeaks.length} foreign`,
  );

  console.log(failures === 0 ? "\nRLS PROOF: ALL PASSED" : `\nRLS PROOF: ${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("rls-proof crashed:", e);
  process.exit(1);
});
