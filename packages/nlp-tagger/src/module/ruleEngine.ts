import { ICategoryRules, EBaseCategories } from "@common";

export type RawTxn = {
  description: string;
  rules: ICategoryRules[];
  credit?: number; // positive for credits
  debit?: number; // positive for debits
  // ... your other fields (date, ref, balance, etc.)
};

const isCredit = (t: RawTxn) => (t.credit ?? 0) > 0 && (t.debit ?? 0) === 0;
const isDebit = (t: RawTxn) => (t.debit ?? 0) > 0 && (t.credit ?? 0) === 0;

export const normalizeDescription = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 @&/().+\-_:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function categorizeByRules(txn: RawTxn): Omit<
  ICategoryRules,
  "ruleId" | "tenantId" | "match" | "confidence" | "createdAt"
> & {
  confidence?: number;
} {
  const desc = normalizeDescription(txn.description || "");
  const side: "CREDIT" | "DEBIT" | "ANY" = isCredit(txn)
    ? "CREDIT"
    : isDebit(txn)
      ? "DEBIT"
      : "ANY";

  for (const rule of txn.rules) {
    if (rule.when && rule.when !== "ANY" && rule.when !== side) continue;

    // ICategoryRules.match is a RegExp; use test() directly
    const matched = rule.match.test(desc);

    if (matched) {
      return {
        category: rule.category,
        subCategory: rule.subCategory,
        reason: rule.reason,
        confidence: rule.confidence ?? 0.8,
      };
    }
  }

  return {
    category: EBaseCategories.unclassified,
    reason: "No rule matched",
    confidence: 0.0,
  };
}
