import { EDGE_LIVE, invokeEdge } from "@/lib/edge";

/**
 * PaymentGateway seam. Phase-1 is a mock that walks an invoice through the
 * settlement states deterministically. A real PSP/bank integration lands in
 * Phase 3 — no payment SDK ever lives in a component.
 */
export type PaymentMethod = "Bank Transfer" | "EFT" | "Card" | "Letter of Credit";

export type SettlementState = "Invoiced" | "Payment Initiated" | "Verified" | "Settled";

export interface SettlementEvent {
  state: SettlementState;
  at: string; // ISO
  note?: string;
}

export interface PaymentIntent {
  invoiceNumber: string;
  amountZAR: number;
  method: PaymentMethod;
  reference: string;
  timeline: SettlementEvent[];
}

export interface PaymentGateway {
  /** Begin a (mock) settlement for an invoice using the chosen method. */
  initiate(invoiceNumber: string, amountZAR: number, method: PaymentMethod): Promise<PaymentIntent>;
  /** Confirm final settlement, appending the Settled event to the timeline. */
  settle(intent: PaymentIntent): Promise<PaymentIntent>;
}

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

const mockGateway: PaymentGateway = {
  async initiate(invoiceNumber, amountZAR, method) {
    return {
      invoiceNumber,
      amountZAR,
      method,
      reference: `PAY-${invoiceNumber.replace(/\D/g, "").slice(-6) || "000000"}`,
      timeline: [
        { state: "Invoiced", at: isoMinutesAgo(90), note: "Invoice issued" },
        { state: "Payment Initiated", at: isoMinutesAgo(2), note: `${method} initiated` },
        { state: "Verified", at: isoMinutesAgo(1), note: "Bank gateway verified (mock)" },
      ],
    };
  },
  async settle(intent) {
    if (intent.timeline.some((e) => e.state === "Settled")) return intent;
    return {
      ...intent,
      timeline: [
        ...intent.timeline,
        { state: "Settled", at: new Date().toISOString(), note: "Funds settled (mock)" },
      ],
    };
  },
};

// Real gateway: initiate creates a Stripe PaymentIntent via the edge function
// (secret key server-side). Settlement is NEVER marked from the client — the
// stripe-webhook function flips invoices to paid after Stripe confirms. Here
// `settle` simply records the client-side intent to await confirmation.
const edgeGateway: PaymentGateway = {
  async initiate(invoiceNumber, amountZAR, method) {
    const r = await invokeEdge<{ clientSecret: string; reference: string }>(
      "create-payment-intent",
      { invoiceNumber, amountZAR, method },
    );
    return {
      invoiceNumber,
      amountZAR,
      method,
      reference: r.reference,
      timeline: [
        { state: "Invoiced", at: new Date().toISOString(), note: "Invoice issued" },
        { state: "Payment Initiated", at: new Date().toISOString(), note: `${method} via Stripe` },
      ],
    };
  },
  // Settlement is webhook-driven; the client cannot self-settle.
  async settle(intent) {
    return intent;
  },
};

export const paymentGateway: PaymentGateway = EDGE_LIVE ? edgeGateway : mockGateway;
