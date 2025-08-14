import { categorizeByRules, keywordCategoryMap } from "./module";

export function tagTransaction(description: string) {
  // 1. Apply rule engine first
  const ruleCategory = categorizeByRules(description, keywordCategoryMap);
  if (ruleCategory) {
    return { category: ruleCategory, source: "rule-engine" };
  }

  // 2. Fallback to AI/NLP categorization
  return { category: "Uncategorized", source: "default" };
}
