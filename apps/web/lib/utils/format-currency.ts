const INR_FULL = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Intl compact ("₹1.2L") — only available in V8/Node; polyfill not needed for target browsers.
const INR_INTL_COMPACT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Format as full INR — e.g. "₹75,000".
 * Returns "—" for non-finite values.
 */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return INR_FULL.format(amount);
}

/**
 * Format as compact INR — e.g. "₹1.2L", "₹5.3K".
 * Falls back to full format for values < 1,000.
 */
export function formatCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return INR_INTL_COMPACT.format(amount);
}

/**
 * Convenience wrapper — pass `compact: true` for KPI cards.
 * Kept for backward-compat with existing dashboard components.
 */
export function formatCurrency(
  amount: number,
  opts?: { compact?: boolean }
): string {
  return opts?.compact ? formatCompact(amount) : formatINR(amount);
}
