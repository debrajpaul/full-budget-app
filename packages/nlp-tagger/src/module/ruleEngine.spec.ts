import { RuleEngine } from "./ruleEngine";
import { mock } from "jest-mock-extended";
import { keywordBaseCategoryMap } from "./rules";
import {
  IRawTxn,
  EBaseCategories,
  ESubIncomeCategories,
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
  let ruleCounter = 0;

  const buildRule = (
    overrides: Partial<ICategoryRules> & { match: RegExp },
  ): ICategoryRules => ({
    ruleId: overrides.ruleId ?? `custom-rule-${ruleCounter++}`,
    tenantId: overrides.tenantId ?? ETenantType.default,
    match: overrides.match,
    category: overrides.category ?? EBaseCategories.income,
    subCategory: overrides.subCategory,
    taggedBy: overrides.taggedBy ?? "RULE_ENGINE",
    when: overrides.when,
    reason: overrides.reason,
    confidence: overrides.confidence,
    createdAt: overrides.createdAt ?? new Date(0).toISOString(),
    updatedAt: overrides.updatedAt,
    deletedAt: overrides.deletedAt,
  });

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
    expect(res.category).toBe(EBaseCategories.unclassified);
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

  it("normalizes punctuation noise before matching", () => {
    const engine = new RuleEngine(logger);
    const customRules = [
      buildRule({
        match: /rent\s+payment/,
        when: "DEBIT",
        category: EBaseCategories.expenses,
        subCategory: ESubExpenseCategories.housing,
        reason: "Normalized rent payment",
      }),
    ];
    const res = engine.categorize(
      makeTxn({
        description: "  RENT***PAYMENT!!!  #Apartment ",
        amount: -25000,
        rules: customRules,
      }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.expenses);
    expect(res.subCategory).toBe(ESubExpenseCategories.housing);
    expect(res.reason).toBe("Normalized rent payment");
  });

  it("treats zero or missing amount as ANY-side and skips credit/debit rules", () => {
    const engine = new RuleEngine(logger);
    const customRules = [
      buildRule({
        match: /sip\s+investment/,
        when: "CREDIT",
        category: EBaseCategories.income,
        reason: "Credit-only SIP",
      }),
      buildRule({
        match: /sip\s+investment/,
        when: "ANY",
        category: EBaseCategories.investment,
        reason: "Neutral SIP",
      }),
    ];
    const res = engine.categorize(
      makeTxn({
        description: "SIP investment",
        amount: 0,
        rules: customRules,
      }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.investment);
    expect(res.reason).toBe("Neutral SIP");
  });

  it("falls back to default confidence when rule omits it", () => {
    const engine = new RuleEngine(logger);
    const customRules = [
      buildRule({
        match: /unique\s+match/,
        when: "CREDIT",
        category: EBaseCategories.income,
        reason: "Missing confidence rule",
      }),
    ];
    const res = engine.categorize(
      makeTxn({
        description: "Unique match case",
        amount: 150,
        rules: customRules,
      }),
    );
    expect(res.taggedBy).toBe("RULE_ENGINE");
    expect(res.category).toBe(EBaseCategories.income);
    expect(res.reason).toBe("Missing confidence rule");
    expect(res.confidence).toBe(0.8);
  });
});
