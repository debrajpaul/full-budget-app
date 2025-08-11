export function categorizeByRules(
  description: string,
  rules: Record<string, string>,
): string | null {
  const lowerDesc = description.toLowerCase();

  for (const [keyword, category] of Object.entries(rules)) {
    if (lowerDesc.includes(keyword)) {
      return category;
    }
  }
  return null;
}
