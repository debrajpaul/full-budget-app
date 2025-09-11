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
  },
  {
    match: /dividend|interim\s+dividend/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.investment,
    reason: "Dividend credit",
    confidence: 0.98,
  },
  {
    match: /sip|mutual\s*funds?/,
    when: "ANY",
    category: EBaseCategories.investment,
    subCategory: ESubInvestmentCategories.mutualFunds,
    reason: "MF/SIP",
    confidence: 0.9,
  },

  // --- SAVINGS / DEPOSIT PRODUCTS ---
  {
    match: /rd\s*installment|recurring\s*deposit|^rd\b/,
    when: "DEBIT",
    category: EBaseCategories.savings,
    subCategory: ESubSavingCategories.emergency,
    reason: "RD contribution",
    confidence: 0.9,
  },
  {
    match: /credit\s+interest|int\s+cr|int\.\s*credit/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.investment,
    reason: "Interest credit",
    confidence: 0.85,
  },

  // --- EXPENSES ---
  {
    match: /tata\s*aia|insurance|mediclaim/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.healthcare,
    reason: "Insurance premium",
    confidence: 0.85,
  },
  {
    match: /rent\b/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.housing,
    reason: "Rent payment",
    confidence: 0.95,
  },
  {
    match: /goods\s+and\s+services\s+tax|[^a-z]gst[^a-z]/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "GST/tax payment",
    confidence: 0.75,
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
  },
  {
    match: /cashfree|razorpay/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.business,
    reason: "Gateway payout",
    confidence: 0.8,
  },
  {
    match: /upi\/cr|upi\s*credit|imps\/?cr|neft\s*cr/,
    when: "CREDIT",
    category: EBaseCategories.income,
    subCategory: ESubIncomeCategories.freelance,
    reason: "Incoming transfer (likely earnings)",
    confidence: 0.6,
  },

  // --- FEES (treated as utilities unless you have a Fees subcategory) ---
  {
    match: /charges|fee|sms\s+charge|debit\s+card\s+annual|pos\s+charge/,
    when: "DEBIT",
    category: EBaseCategories.expenses,
    subCategory: ESubExpenseCategories.utilities,
    reason: "Bank fees/charges",
    confidence: 0.65,
  },

  // --- TRANSFERS / MOVES ---
  {
    // SBI exports are full of these; we keep them neutral as TRANSFER
    match:
      /(withdrawal\s+transfer|to\s+transfer|by\s+transfer|imps|neft|upi|p2a|p2p)/,
    when: "ANY",
    category: EBaseCategories.transfer,
    reason: "Generic transfer",
    confidence: 0.5,
  },
];
