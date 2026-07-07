import type {
  DocumentStatus,
  GovernanceStatus,
  QuoteStatus,
  RegistrationStatus,
  RequestStatus,
  TransactionStatus,
  User,
  UserStatus,
} from "@/types";

/** Map DB shipment.status → UI TransactionStatus. */
export function txStatus(s: string): TransactionStatus {
  if (["completed", "paid", "archived", "cancelled"].includes(s)) return "Closed";
  if (["in_progress", "invoiced", "disputed"].includes(s)) return "In Progress";
  return "Open";
}

export function reqStatus(s: string): RequestStatus {
  if (s === "quoted") return "Quoted";
  if (s === "approved") return "Accepted";
  if (["draft", "submitted"].includes(s)) return "Open";
  return "Confirmed";
}

export function quoteStatus(s: string): QuoteStatus {
  if (s === "selected") return "Accepted";
  if (s === "rejected") return "Rejected";
  return "Quoted";
}

export function regStatus(s: string): RegistrationStatus {
  const map: Record<string, RegistrationStatus> = {
    pending: "Pending",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return map[s] ?? "Pending";
}

export function govStatus(s: string): GovernanceStatus {
  if (s === "verified" || s === "not_required") return "Verified";
  if (s === "failed") return "Failed";
  return "Pending";
}

export function userStatus(s: string): UserStatus {
  if (s === "active") return "Active";
  if (s === "rejected") return "Rejected";
  if (s === "suspended") return "Suspended";
  return "Pending";
}

export function uiRole(r: string): User["role"] {
  if (r === "source_user") return "Source";
  if (r === "demand_user" || r === "subscriber") return "Demand";
  return "Admin";
}

export function docStatus(s: string): DocumentStatus {
  if (s === "approved") return "Approved";
  if (s === "verified") return "Verified";
  if (s === "submitted") return "Submitted";
  return "Draft";
}

/** Map UI role → DB user_role value. */
export function dbRole(role: User["role"]): string {
  if (role === "Source") return "source_user";
  if (role === "Admin") return "operations_admin";
  return "demand_user";
}
