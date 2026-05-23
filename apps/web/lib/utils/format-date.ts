/**
 * Format an ISO-8601 date string or Date object as "12 Jan 2026".
 * This is the primary date formatter — use it in tables, drawers, headings.
 */
export function formatDate(input: string | Date, locale = "en-IN"): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Alias kept for explicit call-sites. Identical to formatDate. */
export const formatDateLong = formatDate;

/**
 * Short form without year — "12 Jan".
 * Use for chart X-axis labels where horizontal space is limited.
 */
export function formatDateShort(
  input: string | Date,
  locale = "en-IN"
): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(d);
}

/** Format month + year as heading — e.g. "January 2026". */
export function formatMonthYear(
  month: number,
  year: number,
  locale = "en-IN"
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

// ── Month-picker helpers ───────────────────────────────────────────────────

export interface MonthYear {
  month: number; // 1–12
  year: number;
}

const VALID_MONTH = /^(1[0-2]|[1-9])$/;
const VALID_YEAR = /^(19|20|21)\d{2}$/;

/**
 * Read and validate `?m=&y=` search params.
 * Falls back to the current month when params are absent or invalid.
 */
export function parseMonthYearParams(
  params:
    | { m?: string | string[]; y?: string | string[] }
    | URLSearchParams
    | Record<string, string | string[] | undefined>
): MonthYear {
  const get = (k: "m" | "y") => {
    if (params instanceof URLSearchParams) return params.get(k) ?? undefined;
    const v = (params as Record<string, string | string[] | undefined>)[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const now = new Date();
  const mRaw = get("m");
  const yRaw = get("y");

  return {
    month:
      mRaw && VALID_MONTH.test(mRaw) ? parseInt(mRaw, 10) : now.getMonth() + 1,
    year:
      yRaw && VALID_YEAR.test(yRaw) ? parseInt(yRaw, 10) : now.getFullYear(),
  };
}

/** Step forward or backward by `delta` months with year wraparound. */
export function stepMonth(mo: MonthYear, delta: number): MonthYear {
  const d = new Date(mo.year, mo.month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
