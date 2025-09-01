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
    const desc =
      "BY TRANSFER-NEFT***ZERODHA BROKING L--";
    expect(categorizeByRules(desc, rules)).toBe(EBaseCategories.savings);
  });
});
