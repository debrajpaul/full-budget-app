import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatMonthYear,
  parseMonthYearParams,
  stepMonth,
} from "./format-date";

// ── formatDate ────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formats an ISO date string as '12 Jan 2026'", () => {
    expect(formatDate("2026-01-12")).toBe("12 Jan 2026");
  });

  it("formats a Date object", () => {
    expect(formatDate(new Date(2026, 11, 1))).toBe("01 Dec 2026");
  });

  it("returns the input string for an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("handles January (month boundary)", () => {
    expect(formatDate("2026-01-01")).toBe("01 Jan 2026");
  });

  it("handles December (month boundary)", () => {
    expect(formatDate("2025-12-31")).toBe("31 Dec 2025");
  });
});

// ── formatDateShort ───────────────────────────────────────────────────────────

describe("formatDateShort", () => {
  it("omits the year", () => {
    const result = formatDateShort("2026-03-15");
    expect(result).toContain("Mar");
    expect(result).not.toContain("2026");
  });

  it("returns the input string for an invalid date", () => {
    expect(formatDateShort("bad")).toBe("bad");
  });
});

// ── formatMonthYear ───────────────────────────────────────────────────────────

describe("formatMonthYear", () => {
  it("formats January correctly", () => {
    expect(formatMonthYear(1, 2026)).toBe("January 2026");
  });

  it("formats December correctly", () => {
    expect(formatMonthYear(12, 2025)).toBe("December 2025");
  });

  it("formats mid-year month", () => {
    expect(formatMonthYear(6, 2026)).toBe("June 2026");
  });
});

// ── parseMonthYearParams ──────────────────────────────────────────────────────

describe("parseMonthYearParams", () => {
  it("parses valid m and y", () => {
    expect(parseMonthYearParams({ m: "4", y: "2026" })).toEqual({ month: 4, year: 2026 });
  });

  it("falls back to current month when params are missing", () => {
    const now = new Date();
    expect(parseMonthYearParams({})).toEqual({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
  });

  it("falls back when month is out of range (0)", () => {
    const now = new Date();
    const result = parseMonthYearParams({ m: "0", y: "2026" });
    expect(result.month).toBe(now.getMonth() + 1);
  });

  it("falls back when month is out of range (13)", () => {
    const now = new Date();
    const result = parseMonthYearParams({ m: "13", y: "2026" });
    expect(result.month).toBe(now.getMonth() + 1);
  });

  it("falls back when year is invalid (text)", () => {
    const now = new Date();
    const result = parseMonthYearParams({ m: "3", y: "abcd" });
    expect(result.year).toBe(now.getFullYear());
  });

  it("handles array params (Next.js catchall)", () => {
    expect(parseMonthYearParams({ m: ["5"], y: ["2027"] })).toEqual({ month: 5, year: 2027 });
  });

  it("accepts URLSearchParams", () => {
    const sp = new URLSearchParams("m=12&y=2025");
    expect(parseMonthYearParams(sp)).toEqual({ month: 12, year: 2025 });
  });

  it("handles boundary month 1 (January)", () => {
    expect(parseMonthYearParams({ m: "1", y: "2026" })).toEqual({ month: 1, year: 2026 });
  });

  it("handles boundary month 12 (December)", () => {
    expect(parseMonthYearParams({ m: "12", y: "2026" })).toEqual({ month: 12, year: 2026 });
  });
});

// ── stepMonth ─────────────────────────────────────────────────────────────────

describe("stepMonth", () => {
  it("steps forward within the same year", () => {
    expect(stepMonth({ month: 3, year: 2026 }, 1)).toEqual({ month: 4, year: 2026 });
  });

  it("wraps forward across year boundary (Dec → Jan)", () => {
    expect(stepMonth({ month: 12, year: 2025 }, 1)).toEqual({ month: 1, year: 2026 });
  });

  it("steps backward within the same year", () => {
    expect(stepMonth({ month: 5, year: 2026 }, -1)).toEqual({ month: 4, year: 2026 });
  });

  it("wraps backward across year boundary (Jan → Dec)", () => {
    expect(stepMonth({ month: 1, year: 2026 }, -1)).toEqual({ month: 12, year: 2025 });
  });

  it("steps multiple months forward", () => {
    expect(stepMonth({ month: 11, year: 2025 }, 3)).toEqual({ month: 2, year: 2026 });
  });
});
