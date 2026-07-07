/**
 * Pro-forma invoice arithmetic (FIX 7). Tax-EXCLUSIVE by default: entered
 * prices are the net amounts and VAT is added on top. All inputs are coerced
 * with Number() and any non-finite value is treated as 0 (never NaN, never
 * string concatenation). Rounding happens at the subtotal/tax/total level with
 * integer-cent arithmetic — not toFixed string math.
 *
 * The default VAT rate lives here (SA VAT 15%, which the project already
 * assumes throughout) rather than being hard-coded inside the calculation.
 */

export const DEFAULT_TAX_RATE = 0.15;

export interface InvoiceLineInput {
  label: string;
  quantity: number | string;
  unitPriceZAR: number | string;
}

export interface InvoiceLine {
  label: string;
  quantity: number;
  unitPriceZAR: number;
  /** quantity × unit price, rounded to 2 decimals. */
  lineTotalZAR: number;
}

export interface InvoiceTotals {
  lines: InvoiceLine[];
  subtotalZAR: number;
  taxRate: number;
  taxZAR: number;
  totalZAR: number;
  /** True when any input was non-finite and coerced to 0. */
  hadInvalidInput: boolean;
}

/** Coerce to a finite number; anything else (NaN, "", null) becomes 0. */
function safeNumber(v: unknown): { value: number; ok: boolean } {
  const n = Number(v);
  return Number.isFinite(n) ? { value: n, ok: true } : { value: 0, ok: false };
}

/** Round a rand amount to 2 decimals via integer cents (no float drift). */
export function round2(v: number): number {
  return Math.round((Number.isFinite(v) ? v : 0) * 100) / 100;
}

/**
 * Compute pro-forma totals from raw line inputs.
 * @param taxRate fractional rate (e.g. 0.15); defaults to DEFAULT_TAX_RATE.
 */
export function computeInvoice(
  rawLines: InvoiceLineInput[],
  taxRate: number = DEFAULT_TAX_RATE,
): InvoiceTotals {
  let hadInvalidInput = false;
  const rate = safeNumber(taxRate);
  if (!rate.ok) hadInvalidInput = true;

  const lines: InvoiceLine[] = rawLines.map((l) => {
    const q = safeNumber(l.quantity);
    const p = safeNumber(l.unitPriceZAR);
    if (!q.ok || !p.ok) hadInvalidInput = true;
    return {
      label: l.label,
      quantity: q.value,
      unitPriceZAR: p.value,
      lineTotalZAR: round2(q.value * p.value),
    };
  });

  const subtotalZAR = round2(lines.reduce((s, l) => s + l.lineTotalZAR, 0));
  const taxZAR = round2(subtotalZAR * rate.value);
  const totalZAR = round2(subtotalZAR + taxZAR);

  return { lines, subtotalZAR, taxRate: rate.value, taxZAR, totalZAR, hadInvalidInput };
}
