/**
 * SignatureProvider seam. Phase-1 captures a typed-name stamp with a timestamp
 * and a deterministic verification token (audit-friendly). A real e-signature
 * vendor (DocuSign-style) integration is Phase 2 behind this same port.
 */
export interface Signature {
  signedBy: string;
  signedAt: string; // ISO
  /** Short token derived from name+time, suitable for an audit trail. */
  token: string;
  method: "typed-name";
}

export interface SignatureProvider {
  sign(fullName: string): Signature;
}

function token(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

export const signatureProvider: SignatureProvider = {
  sign(fullName) {
    const signedAt = new Date().toISOString();
    return {
      signedBy: fullName,
      signedAt,
      token: `VTG-SIG-${token(fullName + signedAt)}`,
      method: "typed-name",
    };
  },
};
