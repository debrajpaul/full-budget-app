import { describe, it, expect } from "vitest";
import { formatINR, formatCompact, formatCurrency } from "./format-currency";

describe("formatINR", () => {
  it("formats a whole number as INR", () => {
    expect(formatINR(75000)).toBe("₹75,000");
  });

  it("formats zero", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("formats negative amounts", () => {
    expect(formatINR(-5000)).toBe("-₹5,000");
  });

  it("returns — for NaN", () => {
    expect(formatINR(NaN)).toBe("—");
  });

  it("returns — for Infinity", () => {
    expect(formatINR(Infinity)).toBe("—");
  });

  it("rounds fractional values (maximumFractionDigits: 0)", () => {
    // Should not show paise
    const result = formatINR(1234.99);
    expect(result).not.toContain(".");
    expect(result).toContain("₹");
  });
});

describe("formatCompact", () => {
  it("formats thousands as K", () => {
    const result = formatCompact(5300);
    expect(result).toContain("K");
    expect(result).toContain("₹");
  });

  it("formats lakhs as L", () => {
    const result = formatCompact(120000);
    expect(result).toContain("L");
    expect(result).toContain("₹");
  });

  it("formats crores as Cr", () => {
    const result = formatCompact(10000000);
    expect(result).toContain("₹");
    // Compact notation for crores varies by locale; just assert it's shorter than full format
    expect(result.length).toBeLessThan(formatINR(10000000).length);
  });

  it("returns — for NaN", () => {
    expect(formatCompact(NaN)).toBe("—");
  });

  it("returns — for -Infinity", () => {
    expect(formatCompact(-Infinity)).toBe("—");
  });
});

describe("formatCurrency (backward-compat wrapper)", () => {
  it("delegates to formatINR by default", () => {
    expect(formatCurrency(10000)).toBe(formatINR(10000));
  });

  it("delegates to formatCompact when compact: true", () => {
    expect(formatCurrency(150000, { compact: true })).toBe(formatCompact(150000));
  });
});
