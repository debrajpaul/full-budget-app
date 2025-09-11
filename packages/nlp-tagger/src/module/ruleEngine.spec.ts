import { categorizeByRules, RawTxn } from "./ruleEngine";
import { keywordBaseCategoryMap } from "./rules";
import {
  EBaseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubExpenseCategories,
  ETenantType,
  ICategoryRules,
} from "@common";

describe("categorizeByRules (updated API)", () => {
  const rules: ICategoryRules[] = keywordBaseCategoryMap.map((r, i) => ({
    ...r,
    ruleId: `test-${i}`,
    tenantId: ETenantType.default,
    createdAt: new Date(0).toISOString(),
  }));

  const makeTxn = (overrides: Partial<RawTxn>): RawTxn => ({
    description: overrides.description || "",
    rules,
    credit: overrides.credit,
    debit: overrides.debit,
  });

  it("returns category object for known keywords (credit-side)", () => {
    const res = categorizeByRules(
      makeTxn({ description: "Salary credited via ACH", credit: 1000 }),
    );
    expect(res.category).toBe(EBaseCategories.income);
    expect(res.subCategory).toBe(ESubIncomeCategories.salary);
    expect(res.reason).toBe("ACH credit / payroll");
    expect(res.confidence).toBeGreaterThan(0);
  });

  it("classifies UPI generic as transfer (any side)", () => {
    const res = categorizeByRules(
      makeTxn({ description: "Paid using UPI at store" }),
    );
    expect(res.category).toBe(EBaseCategories.transfer);
    expect(res.reason).toBe("Generic transfer");
  });

  it("handles Zerodha/CDSL as investment (any side)", () => {
    const res = categorizeByRules(
      makeTxn({
        description:
          "BY TRANSFER-NEFT*YESB0000001*YESB40930207163*ZERODHA BROKING L--",
      }),
    );
    expect(res.category).toBe(EBaseCategories.investment);
    expect(res.subCategory).toBe(ESubInvestmentCategories.stocks);
  });

  it("matches case-insensitively on description", () => {
    const res1 = categorizeByRules(
      makeTxn({ description: "DIVIDEND CREDITED", credit: 10 }),
    );
    expect(res1.category).toBe(EBaseCategories.income);
    expect(res1.subCategory).toBe(ESubIncomeCategories.investment);

    const res2 = categorizeByRules(
      makeTxn({ description: "rent paid for flat", debit: 1000 }),
    );
    expect(res2.category).toBe(EBaseCategories.expenses);
    expect(res2.subCategory).toBe(ESubExpenseCategories.housing);
  });

  it("returns unclassified when no rule matches", () => {
    const res = categorizeByRules(
      makeTxn({ description: "No rule applies here" }),
    );
    expect(res.category).toBe(EBaseCategories.unclassified);
    expect(res.reason).toBe("No rule matched");
    expect(res.confidence).toBe(0);
  });

  it("respects credit/debit gating via rule.when", () => {
    // 'dividend' is CREDIT-side rule; should not match on DEBIT
    const resDebitSide = categorizeByRules(
      makeTxn({ description: "interim dividend posted", debit: 50 }),
    );
    expect(resDebitSide.category).toBe(EBaseCategories.unclassified);

    // 'rent' is DEBIT-side rule; should not match on CREDIT
    const resCreditSide = categorizeByRules(
      makeTxn({ description: "monthly rent", credit: 5000 }),
    );
    expect(resCreditSide.category).toBe(EBaseCategories.unclassified);
  });
});
