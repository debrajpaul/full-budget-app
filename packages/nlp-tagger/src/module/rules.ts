import {
  EBaseCategories,
  ICategoryRules,
  ESubInvestmentCategories,
  ESubIncomeCategories,
  ESubSavingCategories,
  ESubExpenseCategories,
  // ESubLoanCategories,
} from "@common";

export const keywordBaseCategoryMap: Omit<
  ICategoryRules,
  "ruleId" | "tenantId" | "createdAt"
>[] = [
  // --- INVESTMENTS ---
  {
    match: /zerodha|central\s+depository|cdsl|hdfcsec|icici\s*direct/,
    when: "ANY",
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.stocks,
    reason: "Broker/CDSL reference",
    confidence: 0.95,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /dividend|interim\s+dividend/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.investment,
    reason: "Dividend credit",
    confidence: 0.98,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /sip|mutual\s*funds?/,
    when: "ANY",
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /indian\s*clearin/i,
    when: "DEBIT",
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP via Indian Clearing debit",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /indian\s*clearin/i,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP via Indian Clearing credit",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /nps|nsc|national\s*pension\s*scheme/,
    when: "ANY",
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "NPS/NSC",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },

  // --- SAVINGS / DEPOSIT PRODUCTS ---
  {
    match: /rd\s*installment|recurring\s*deposit|^rd\b/,
    when: "DEBIT",
    category: EBaseCategories.savings,
    subCategory: ESubSavingCategories.emergency,
    reason: "RD contribution",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /credit\s+interest|int\s+cr|int\.\s*credit/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.investment,
    reason: "Interest credit",
    confidence: 0.85,
    taggedBy: "RULE_ENGINE",
  },

  // --- EXPENSES ---
  {
    match: /tata\s*aia|insurance|policybazaar|lic|mediclaim/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.healthcare,
    reason: "Insurance premium",
    confidence: 0.85,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /rent\b/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.housing,
    reason: "Rent payment",
    confidence: 0.95,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /maid\s+salary/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.housing,
    reason: "Maid salary payment",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /billpay\s*dr.*hdfccs/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Credit card bill payment",
    confidence: 0.8,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /goods\s+and\s+services\s+tax|[^a-z]gst[^a-z]|gst\s+payment/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "GST/tax payment",
    confidence: 0.75,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /swiggy|zomato|blinkit|bigbasket|grofers/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.food,
    reason: "Food/grocery delivery",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },
  {
    // Include BMRCL (Bangalore Metro Rail Corporation Limited) to ensure metro
    // payments from HDFC statements are captured as transportation expenses.
    match:
      /uber|ola|bmrcl|irctc|railway|metro|flight|airways|petrol|diesel|fuel/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.transportation,
    reason: "Transportation expense",
    confidence: 0.85,
    taggedBy: "RULE_ENGINE",
  },
  {
    match:
      /bescom|torrent\s*power|electricity|broadband|jio|airtel|\bvi\b|bsnl|internet|water\s+bill/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Utility payment",
    confidence: 0.8,
    taggedBy: "RULE_ENGINE",
  },

  // --- INCOME (payouts & salary-like) ---
  {
    // ACH credits from companies often are salary/vendor payouts (seen: KPIT, etc.)
    match: /achcr|bulk\s+posting-?achcr|salary|payroll/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.salary,
    reason: "ACH credit / payroll",
    confidence: 0.7,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /cashfree|razorpay/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.business,
    reason: "Gateway payout",
    confidence: 0.8,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /upi\/cr|upi\s*credit|imps\/?cr|neft\s*cr/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.freelance,
    reason: "Incoming transfer (likely earnings)",
    confidence: 0.6,
    taggedBy: "RULE_ENGINE",
  },
  {
    match: /robosoft/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.salary,
    reason: "Salary credit (Robosoft)",
    confidence: 0.9,
    taggedBy: "RULE_ENGINE",
  },

  // --- FEES (treated as utilities unless you have a Fees subcategory) ---
  {
    match: /charge|fee|sms\s+charge|annual\s+fee|atm\s+withdrawal|penalty/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Bank fees/charges",
    confidence: 0.65,
    taggedBy: "RULE_ENGINE",
  },

  // --- TRANSFERS / MOVES ---
  // {
  //   // we keep them neutral as TRANSFER
  //   match:
  //     /(withdrawal\s+transfer|to\s+transfer|by\s+transfer|funds\s+transfer|imps|neft|upi|p2a|p2p|transfer-inb|rtgs|ecs)/,
  //   when: "ANY",
  //   category: EBaseCategories.transfer,
  //   reason: "Generic transfer",
  //   confidence: 0.5,
  //   taggedBy: "RULE_ENGINE",
  // },
];
