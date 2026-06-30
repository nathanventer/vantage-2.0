/** VTG reference prefixes minted by public.next_ref(). */
export const REF_PREFIXES = ["TXN", "RFQ", "QTE", "PO", "INV", "POP"] as const;
export type RefPrefix = (typeof REF_PREFIXES)[number];

const REF_RE = /^VTG-(TXN|RFQ|QTE|PO|INV|POP)-(\d+)$/;

/** Parse a VTG reference into prefix + numeric suffix, or null if invalid. */
export function parseReference(ref: string): { prefix: RefPrefix; number: number } | null {
  const m = REF_RE.exec(ref.trim());
  if (!m) return null;
  return { prefix: m[1] as RefPrefix, number: Number(m[2]) };
}

export function isValidReference(ref: string): boolean {
  return REF_RE.test(ref.trim());
}

/** Build a display reference (for mock/offline paths without next_ref RPC). */
export function formatReference(prefix: RefPrefix, n: number): string {
  return `VTG-${prefix}-${n}`;
}
