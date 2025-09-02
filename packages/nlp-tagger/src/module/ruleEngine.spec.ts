import { categorizeByRules } from "./ruleEngine";
import { keywordBaseCategoryMap } from "./rules";
import { EBaseCategories } from "@common";

describe("categorizeByRules", () => {
  const rules = keywordBaseCategoryMap;

  it("returns correct base category for known keywords in map", () => {
    expect(categorizeByRules("Salary credited via RTGS", rules)).toBe(
      EBaseCategories.income,
    );
    expect(categorizeByRules("Paid using UPI at store", rules)).toBe(
      EBaseCategories.expenses,
    );
    expect(
      categorizeByRules(
        "BY TRANSFER-NEFT*YESB0000001*YESB40930207163*ZERODHA BROKING L--",
        rules,
      ),
    ).toBe(EBaseCategories.savings);
  });

  it("matches case-insensitively on description", () => {
    expect(categorizeByRules("RTGS credit received", rules)).toBe(
      EBaseCategories.income,
    );
    expect(categorizeByRules("paid via UPI", rules)).toBe(
      EBaseCategories.expenses,
    );
    expect(categorizeByRules("ZERODHA investment", rules)).toBe(
      EBaseCategories.savings,
    );
  });

  it("returns default when no keyword matches", () => {
    expect(categorizeByRules("No rule applies here", rules)).toBe(
      EBaseCategories.default,
    );
  });

  it("picks the earliest match when multiple keywords appear", () => {
    expect(categorizeByRules("rtgs and upi in one line", rules)).toBe(
      EBaseCategories.income,
    );
    expect(categorizeByRules("upi then rtgs in one line", rules)).toBe(
      EBaseCategories.expenses,
    );
  });

  it("handles Zerodha transfers as savings via explicit regex", () => {
    const desc = "BY TRANSFER-NEFT***ZERODHA BROKING L--";
    expect(categorizeByRules(desc, rules)).toBe(EBaseCategories.savings);
  });

  it("uses fallback heuristics for common patterns when no explicit rule matches", () => {
    expect(categorizeByRules("Cashback credited", rules)).toBe(
      EBaseCategories.income,
    );
    expect(categorizeByRules("EMI charge applied", rules)).toBe(
      EBaseCategories.expenses,
    );
    expect(categorizeByRules("SIP investment to MF", rules)).toBe(
      EBaseCategories.savings,
    );
    expect(categorizeByRules("Amazon purchase #1234", rules)).toBe(
      EBaseCategories.expenses,
    );
  });

  it("classifies UPI split/settle links as expenses by default", () => {
    const descs = [
      "Splitwise settle up via upi://pay?pa=alice@okicici&am=500",
      "Paid for split using UPI link upi://pay?pa=bob@oksbi",
      "UPI split bill to charlie@okaxis",
    ];
    for (const d of descs) {
      expect(categorizeByRules(d, rules)).toBe(EBaseCategories.expenses);
    }
  });

  it("classifies UPI split/settle as income when received/credit indicated", () => {
    const descs = [
      "UPI settlement received from Dave upi://pay?pa=dave@okhdfcbank",
      "Splitwise settle CR via UPI from erin@okicici",
      "UPI split received to account from frank@oksbi",
    ];
    for (const d of descs) {
      expect(categorizeByRules(d, rules)).toBe(EBaseCategories.income);
    }
  });
});
