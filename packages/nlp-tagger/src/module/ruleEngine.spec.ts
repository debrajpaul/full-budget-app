import { RuleEngine } from "./ruleEngine";
import { mock } from "jest-mock-extended";
import { keywordBaseCategoryMap } from "./rules";
import {
  IRawTxn,
  EBaseCategories,
  ESubIncomeCategories,
  ESubInvestmentCategories,
  ESubExpenseCategories,
  ETenantType,
  ICategoryRules,
  ILogger,
} from "@common";

describe("RuleEngine.categorize", () => {
  const rules: ICategoryRules[] = keywordBaseCategoryMap.map((r, i) => ({
    ...r,
    ruleId: `test-${i}`,
    tenantId: ETenantType.default,
    createdAt: new Date(0).toISOString(),
  }));

  let logger: ReturnType<typeof mock<ILogger>>;

  beforeEach(() => {
    logger = mock<ILogger>();
  });

  const makeTxn = (overrides: Partial<IRawTxn> = {}): IRawTxn => ({
    description: overrides.description ?? "",
    rules: overrides.rules ?? rules,
    amount: overrides.amount,
  });

  it("returns category object for known keywords (credit-side)", () => {
    const engine = new RuleEngine(logger);
    const res = engine.categorize(
      makeTxn({ description: "Salary credited via ACH", amount: 1000 }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.income);
    expect(res.subCategory).toBe(ESubIncomeCategories.salary);
    expect(res.reason).toBe("ACH credit / payroll");
    expect(res.confidence).toBeGreaterThan(0);
  });

  it("returns unclassified when transfer rule is disabled", () => {
    const engine = new RuleEngine(logger);
    const res = engine.categorize(
      makeTxn({ description: "Paid using UPI at store" }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.unclassified);
    expect(res.reason).toBe("No rule matched");
    expect(res.confidence).toBe(0);
  });

  it("handles Zerodha/CDSL as investment (any side)", () => {
    const engine = new RuleEngine(logger);
    const res = engine.categorize(
      makeTxn({
        description:
          "BY TRANSFER-NEFT*YESB0000001*YESB40930207163*ZERODHA BROKING L--",
      }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.investment);
    expect(res.subCategory).toBe(ESubInvestmentCategories.stocks);
  });

  it("matches case-insensitively on description", () => {
    const engine = new RuleEngine(logger);
    const res1 = engine.categorize(
      makeTxn({ description: "DIVIDEND CREDITED", amount: 10 }),
    );
    expect(res1.taggedBy).toBe("RULE_ENGINE");
    expect(res1.category).toBe(EBaseCategories.income);
    expect(res1.subCategory).toBe(ESubIncomeCategories.investment);

    const res2 = engine.categorize(
      makeTxn({ description: "rent paid for flat", amount: -1000 }),
    );
    expect(res2.taggedBy).toBe("RULE_ENGINE");
    expect(res2.category).toBe(EBaseCategories.expenses);
    expect(res2.subCategory).toBe(ESubExpenseCategories.housing);
  });

  it("returns unclassified when no rule matches", () => {
    const engine = new RuleEngine(logger);
    const res = engine.categorize(
      makeTxn({ description: "No rule applies here" }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.unclassified);
    expect(res.reason).toBe("No rule matched");
    expect(res.confidence).toBe(0);
  });

  it("returns unclassified when there are no rules to evaluate", () => {
    const engine = new RuleEngine(logger);
    const res = engine.categorize(
      makeTxn({ description: "anything here", rules: [] }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.unclassified);
    expect(res.reason).toBe("No rules defined");
    expect(res.confidence).toBe(0);
  });

  it("respects credit/debit gating via rule.when", () => {
    const engine = new RuleEngine(logger);
    // 'dividend' is CREDIT-side rule; should not match on DEBIT
    const resDebitSide = engine.categorize(
      makeTxn({ description: "interim dividend posted", amount: -50 }),
    );
    expect(resDebitSide.taggedBy).toBe("RULE_ENGINE");
    expect(resDebitSide.category).toBe(EBaseCategories.unclassified);

    // 'rent' is DEBIT-side rule; should not match on CREDIT
    const resCreditSide = engine.categorize(
      makeTxn({ description: "monthly rent", amount: 5000 }),
    );
    expect(resCreditSide.taggedBy).toBe("RULE_ENGINE");
    expect(resCreditSide.category).toBe(EBaseCategories.unclassified);
  });
});
