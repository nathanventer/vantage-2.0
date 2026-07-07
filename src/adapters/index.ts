/**
 * Adapter seams barrel. The UI imports ports from "@/adapters" only; concrete
 * mock/real implementations are switched internally (mirroring the data `api`
 * and `authAdapter` seams). No external SDK is ever imported by a component.
 */
export { authAdapter, AUTH_BACKEND, IS_SUPABASE, DEMO_LOGINS } from "./auth";
export type { AuthAdapter } from "./auth";

export {
  optimizer,
  OPTIMIZER_WEIGHTS,
  adjustOptimizerWeight,
  riskFlagFromScore,
  riskFlagChipStatus,
} from "./optimizer";
export type {
  Optimizer,
  OptimizerResult,
  ScoredQuote,
  QuoteScoreInput,
  OptimizerWeights,
  RiskFlag,
} from "./optimizer";

export { paymentGateway } from "./paymentGateway";
export type {
  PaymentGateway,
  PaymentIntent,
  PaymentMethod,
  SettlementEvent,
  SettlementState,
} from "./paymentGateway";

export { signatureProvider } from "./signatureProvider";
export type { SignatureProvider, Signature } from "./signatureProvider";

export { documentRenderer } from "./documentRenderer";
export type { DocumentRenderer, RenderDoc, RenderField, RenderTable } from "./documentRenderer";

export { complianceVerifier } from "./complianceVerifier";
export type { ComplianceVerifier, ComplianceResult } from "./complianceVerifier";

export { notifier } from "./notifier";
export type { Notifier, NotifyInput } from "./notifier";

export { fleetTracker } from "./fleetTracker";
export type { FleetTracker, FleetPosition } from "./fleetTracker";
