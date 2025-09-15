import { keywordBaseCategoryMap } from "./rules";
import {
  EBaseCategories,
  ESubInvestmentCategories,
  ESubIncomeCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
} from "@common";

// Small helper to find the first matching rule for a normalized description
const findRule = (
  description: string,
  when: "CREDIT" | "DEBIT" | "ANY" = "ANY",
) => {
  const desc = description.toLowerCase();
  return keywordBaseCategoryMap.find(
    (r) => (r.when === "ANY" || r.when === when) && r.match.test(desc),
  );
};

describe("keywordBaseCategoryMap (rule patterns)", () => {
  it("contains expected investment rules (e.g., Zerodha/CDSL)", () => {
    const r = findRule("payment to zerodha broking", "ANY");
    expect(r?.category).toBe(EBaseCategories.investment);
    expect(r?.subCategory).toBe(ESubInvestmentCategories.stocks);
  });

  it("classifies dividends as income (credit-side)", () => {
    const r = findRule("interim dividend credited", "CREDIT");
    expect(r?.category).toBe(EBaseCategories.income);
    expect(r?.subCategory).toBe(ESubIncomeCategories.investment);
  });

  it("classifies SIP/MF as investment (any side)", () => {
    const r = findRule("sip to mutual funds", "ANY");
    expect(r?.category).toBe(EBaseCategories.investment);
    expect(r?.subCategory).toBe(ESubInvestmentCategories.mutualFunds);
  });

  it("classifies RD installment as savings (debit-side)", () => {
    const r = findRule("rd installment paid", "DEBIT");
    expect(r?.category).toBe(EBaseCategories.savings);
    expect(r?.subCategory).toBe(ESubSavingCategories.emergency);
  });

  it("classifies credit interest as income (credit-side)", () => {
    const r = findRule("credit interest posted", "CREDIT");
    expect(r?.category).toBe(EBaseCategories.income);
    expect(r?.subCategory).toBe(ESubIncomeCategories.investment);
  });

  it("classifies rent as expenses (debit-side)", () => {
    const r = findRule("rent paid for flat", "DEBIT");
    expect(r?.category).toBe(EBaseCategories.expenses);
    expect(r?.subCategory).toBe(ESubExpenseCategories.housing);
  });

  it("classifies UPI credit patterns as income (credit-side)", () => {
    const r = findRule("upi/cr from client", "CREDIT");
    expect(r?.category).toBe(EBaseCategories.income);
    expect(r?.subCategory).toBe(ESubIncomeCategories.freelance);
  });

  it("classifies generic UPI/IMPS/NEFT as transfer (any side)", () => {
    const r = findRule("paid via upi to store", "DEBIT");
    expect(r?.category).toBe(EBaseCategories.transfer);
  });

  it("does not match unrelated text", () => {
    const r = findRule("random grocery brand that is unknown", "DEBIT");
    expect(r).toBeUndefined();
  });
});
