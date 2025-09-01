import { EBaseCategories } from "@common";

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function categorizeByRules(
  description: string,
  rules: Record<string, EBaseCategories>
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
  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'i');
  const match = lowerDesc.match(pattern);
  if (match && match[1]) {
    const found = match[1].toLowerCase();
    const category = rules[found];
    if (category) return category;
  }
  return EBaseCategories.default;
}
