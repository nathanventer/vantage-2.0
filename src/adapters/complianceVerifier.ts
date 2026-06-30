/**
 * ComplianceVerifier seam. Phase-1 returns a deterministic 'pending'/'verified'
 * result (manual admin verification is the source of truth). A real automated
 * verifier (SARS / CIPC lookups) is a later phase behind this same port.
 */
import { EDGE_LIVE, invokeEdge } from "@/lib/edge";

export type ComplianceResult = "pending" | "verified" | "failed";

export interface ComplianceVerifier {
  verify(kind: string, reference?: string, documentId?: string): Promise<ComplianceResult>;
}

const mockVerifier: ComplianceVerifier = {
  async verify() {
    // Manual verification gate — newly recorded docs start pending.
    return "pending";
  },
};

// Real impl calls the verify-compliance edge function (CIPC/SARS/bank/VAT/B-BBEE),
// which holds the provider credentials server-side and writes the result.
const edgeVerifier: ComplianceVerifier = {
  async verify(kind, reference, documentId) {
    const r = await invokeEdge<{ status: ComplianceResult }>("verify-compliance", {
      kind,
      reference,
      documentId,
    });
    return r.status;
  },
};

export const complianceVerifier: ComplianceVerifier = EDGE_LIVE ? edgeVerifier : mockVerifier;
