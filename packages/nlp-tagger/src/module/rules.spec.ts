import { keywordBaseCategoryMap } from "./rules";
import {
  ERawTxnType,
  EBaseCategories,
  ESubInvestmentCategories,
  ESubIncomeCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
} from "@common";

// Small helper to find the first matching rule for a normalized description
const findRule = (description: string, when: ERawTxnType = ERawTxnType.any) => {
  const desc = description.toLowerCase();
  return keywordBaseCategoryMap.find(
    (r) => (r.when === ERawTxnType.any || r.when === when) && r.match.test(desc)
  );
};

type RuleCase = {
  description: string;
  when: ERawTxnType;
  category: EBaseCategories;
  subCategory?:
    | ESubInvestmentCategories
    | ESubIncomeCategories
    | ESubSavingCategories
    | ESubExpenseCategories;
  reason: string;
};

const ruleCases: RuleCase[] = [
  {
    description: "payment to zerodha broking",
    when: ERawTxnType.debit,
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.stocks,
    reason: "Broker/CDSL reference",
  },
  {
    description: "zerodha payout credited",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubInvestmentCategories.stocks,
    reason: "Broker/CDSL reference",
  },
  {
    description: "interim dividend credited",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.investment,
    reason: "Dividend credit",
  },
  {
    description: "sip to mutual funds",
    when: ERawTxnType.any,
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP",
  },
  {
    description: "indian clearing debit",
    when: ERawTxnType.debit,
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP via Indian Clearing debit",
  },
  {
    description: "indian clearing credit",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP via Indian Clearing credit",
  },
  {
    description: "nps contribution",
    when: ERawTxnType.any,
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "NPS/NSC",
  },
  {
    description: "rd installment paid",
    when: ERawTxnType.debit,
    category: EBaseCategories.savings,
    subCategory: ESubSavingCategories.emergency,
    reason: "RD contribution",
  },
  {
    description: "credit interest posted",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.investment,
    reason: "Interest credit",
  },
  {
    description: "insurance premium deduction",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.healthcare,
    reason: "Insurance premium",
  },
  {
    description: "rent paid for flat",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.housing,
    reason: "Rent payment",
  },
  {
    description: "maid salary transfer",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.housing,
    reason: "Maid salary payment",
  },
  {
    description: "billpay dr hdfccs credit card",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Credit card bill payment",
  },
  {
    description: "goods and services tax payment",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "GST/tax payment",
  },
  {
    description: "swiggy order payment",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.food,
    reason: "Food/grocery delivery",
  },
  {
    description: "metro recharge bmrcl",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.transportation,
    reason: "Transportation expense",
  },
  {
    description: "bescom electricity bill",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Utility payment",
  },
  {
    description: "achcr payroll credit",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.salary,
    reason: "ACH credit / payroll",
  },
  {
    description: "cashfree payout received",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.business,
    reason: "Gateway payout",
  },
  {
    description: "upi/cr from client",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.freelance,
    reason: "Incoming transfer (likely earnings)",
  },
  {
    description: "robosoft payout received",
    when: ERawTxnType.credit,
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.salary,
    reason: "Salary credit (Robosoft)",
  },
  {
    description: "bank charge debit",
    when: ERawTxnType.debit,
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Bank fees/charges",
  },
];

describe("keywordBaseCategoryMap (rule patterns)", () => {
  it.each(ruleCases)(
    "matches %s",
    ({ description, when, category, subCategory, reason }) => {
      const rule = findRule(description, when);

      expect(rule).toBeDefined();
      const matchedRule = rule!;

      expect(matchedRule.category).toBe(category);
      expect(matchedRule.subCategory).toBe(subCategory ?? undefined);
      expect(matchedRule.reason).toBe(reason);
      expect(matchedRule.taggedBy).toBe("RULE_ENGINE");
      expect(matchedRule.confidence).toBeGreaterThan(0);
    }
  );

  it("does not match credit-only rules on debit transactions", () => {
    const rule = findRule("interim dividend credited", ERawTxnType.debit);
    expect(rule).toBeUndefined();
  });

  it("does not match generic transfers while transfer rule is disabled", () => {
    const transfer = findRule("upi transfer to friend", ERawTxnType.debit);
    expect(transfer).toBeUndefined();
  });

  it("does not match unrelated text", () => {
    const r = findRule(
      "random grocery brand that is unknown",
      ERawTxnType.debit
    );
    expect(r).toBeUndefined();
  });
});
