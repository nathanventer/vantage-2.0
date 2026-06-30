/**
 * ComplianceVerifier seam. Phase-1 returns a deterministic 'pending'/'verified'
 * result (manual admin verification is the source of truth). A real automated
 * verifier (SARS / CIPC lookups) is a later phase behind this same port.
 */
export type ComplianceResult = "pending" | "verified" | "failed";

export interface ComplianceVerifier {
  verify(docType: string, reference?: string): Promise<ComplianceResult>;
}

export const complianceVerifier: ComplianceVerifier = {
  async verify() {
    // Manual verification gate in Phase 1 — newly recorded docs start pending.
    return "pending";
  },
};
