import { EBaseCategories } from "@common";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function categorizeByRules(
  description: string,
  rules: Record<string, EBaseCategories>,
): EBaseCategories {
  const lowerDesc = description.toLowerCase();

  // Explicit override: any mention of Zerodha counts as savings
  if (/zerodha/i.test(lowerDesc)) {
    return EBaseCategories.savings;
  }

  const keywords = Object.keys(rules);
  if (lowerDesc.length === 0 || keywords.length === 0) {
    return EBaseCategories.default;
  }
  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "i");
  const match = lowerDesc.match(pattern);
  if (match && match[1]) {
    const found = match[1].toLowerCase();
    const category = rules[found];
    if (category) return category;
  }
  // Fallback heuristics when explicit rules don't match
  // Income-oriented signals
  const incomeFallbacks = [
    /refund|reversal|cashback|reimb(ursement)?/i,
    /dividend|interest\s*cr|int\s*cr/i,
  ];
  if (incomeFallbacks.some((re) => re.test(lowerDesc))) {
    return EBaseCategories.income;
  }

  // Savings/investment signals
  const savingsFallbacks = [
    /mutual\s*fund|mf\b|sip\b|nps\b|ppf\b|fd\b|rd\b/i,
    /investment|invest\b/i,
  ];
  if (savingsFallbacks.some((re) => re.test(lowerDesc))) {
    return EBaseCategories.savings;
  }

  // Expense-oriented signals
  const expenseFallbacks = [
    /charge|fee|penalty|fine/i,
    /purchase|payment|pos\b|card\b|atm\b/i,
    /uber|ola|swiggy|zomato|amazon|flipkart|myntra/i,
    /electricity|power\b|gas\b|water\b|broadband|internet|dth|mobile\s*recharge/i,
  ];
  if (expenseFallbacks.some((re) => re.test(lowerDesc))) {
    return EBaseCategories.expenses;
  }

  return EBaseCategories.default;
}
