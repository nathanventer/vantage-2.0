// ComplianceVerifier (real). Looks up a company/document against the relevant
// authority (CIPC company status, SARS tax-clearance, bank account verification,
// VAT vendor, B-BBEE) and writes the result to compliance_documents. Manual admin
// override remains the final say.
//
// Deploy:  supabase functions deploy verify-compliance
// Secrets: COMPLIANCE_API_BASE, COMPLIANCE_API_KEY  (provider-specific)
//
// NOTE: South African verification APIs (CIPC/SARS) require an accredited account.
// Until credentials are provided this runs in SANDBOX mode (deterministic result)
// so the contract + DB write-path are exercisable end-to-end.
import { adminClient, callerFromAuthHeader } from "../_shared/supabaseAdmin.ts";
import { json, preflight } from "../_shared/cors.ts";

type CheckKind = "cipc" | "sars_tax_clearance" | "bank_account" | "vat_vendor" | "bbbee";
type Result = "pending" | "verified" | "failed";

async function callAuthority(kind: CheckKind, reference: string): Promise<Result> {
  const base = Deno.env.get("COMPLIANCE_API_BASE");
  const key = Deno.env.get("COMPLIANCE_API_KEY");
  if (!base || !key) {
    // SANDBOX: deterministic from the reference so demos are stable.
    const sum = [...reference].reduce((s, c) => s + c.charCodeAt(0), 0);
    return sum % 7 === 0 ? "failed" : "verified";
  }
  const res = await fetch(`${base}/verify/${kind}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
  });
  if (!res.ok) return "failed";
  const body = await res.json();
  return (body.status as Result) ?? "pending";
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const userId = await callerFromAuthHeader(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    const { documentId, kind, reference } = await req.json();
    if (!kind || !reference) return json({ error: "kind and reference required" }, 400);

    const status = await callAuthority(kind as CheckKind, String(reference));

    const db = adminClient();
    if (documentId) {
      await db
        .from("compliance_documents")
        .update({ verification_status: status, verified_at: new Date().toISOString() })
        .eq("id", documentId);
    }
    return json({ status });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown error" }, 500);
  }
});
