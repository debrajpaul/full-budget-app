import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ─── Formatting helpers ──────────────────────────────────────────────── */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const INR_COMPACT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Format a number as INR. Pass `compact: true` for "₹1.2L" style. */
export function formatCurrency(amount: number, opts?: { compact?: boolean }) {
  if (!Number.isFinite(amount)) return "—";
  return opts?.compact ? INR_COMPACT.format(amount) : INR.format(amount);
}

/** Parse the backend's `String` date and format as "12 May" / locale-aware. */
export function formatDate(input: string | Date, locale = "en-IN") {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(d);
}

/** Same but with year (for headers, tables). */
export function formatDateLong(input: string | Date, locale = "en-IN") {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Format month name for headings: "May 2026". */
export function formatMonthYear(month: number, year: number, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

/* ─── Month-picker helpers (used by ?m=&y= URL params) ────────────────── */

export interface MonthYear {
  month: number; // 1-12
  year: number;
}

const VALID_MONTH = /^(1[0-2]|[1-9])$/;
const VALID_YEAR = /^(19|20|21)\d{2}$/;

/** Read & validate ?m=&y= search params. Falls back to current month. */
export function parseMonthYearParams(
  params: { m?: string | string[]; y?: string | string[] } | URLSearchParams
): MonthYear {
  const get = (k: "m" | "y") => {
    if (params instanceof URLSearchParams) return params.get(k) ?? undefined;
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const now = new Date();
  const mRaw = get("m");
  const yRaw = get("y");

  const month =
    mRaw && VALID_MONTH.test(mRaw) ? parseInt(mRaw, 10) : now.getMonth() + 1;
  const year =
    yRaw && VALID_YEAR.test(yRaw) ? parseInt(yRaw, 10) : now.getFullYear();

  return { month, year };
}

/** Step one month with wraparound — used by month picker arrows. */
export function stepMonth(mo: MonthYear, delta: number): MonthYear {
  const d = new Date(mo.year, mo.month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
