import { IS_SUPABASE } from "./auth";

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
        { state: "Payment Initiated", at: isoMinutesAgo(60), note: `${method} initiated` },
        { state: "Verified", at: isoMinutesAgo(30), note: "Bank gateway verified (mock)" },
      ],
    };
  },
};

// TODO Phase 3: real PSP/bank gateway implementation behind this same port.
const realGateway: PaymentGateway = mockGateway;

export const paymentGateway: PaymentGateway = IS_SUPABASE ? realGateway : mockGateway;
