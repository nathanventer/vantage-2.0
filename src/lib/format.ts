/** Shared ZAR currency formatter — tabular, no cents by default. */
export function formatZAR(n: number | null | undefined, decimals = 0): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: decimals,
  }).format(n ?? 0);
}
