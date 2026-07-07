/** Company-scoped compliance doc object key: `<companyId>/<docType>/<filename>`. */
export function complianceDocPath(companyId: string, docType: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${companyId}/${docType}/${Date.now()}-${safe}`;
}

/** Shipment POD object key: `<companyId>/pod/<reference>-<ts>.<ext>`. */
export function podDocPath(companyId: string, reference: string, fileName: string): string {
  const ext = fileName.split(".").pop() || "pdf";
  return `${companyId}/pod/${reference}-${Date.now()}.${ext}`;
}

export const COMPLIANCE_BUCKET = "compliance-docs" as const;
export const TRANSACTION_BUCKET = "transaction-docs" as const;
