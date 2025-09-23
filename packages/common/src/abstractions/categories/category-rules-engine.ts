import { ICategoryRules } from "./category-rules";

export interface IRawTxn {
  description: string;
  rules: ICategoryRules[];
  balance?: number | null; // positive for credits & negative for debits
  // ... your other fields (date, ref, balance, etc.)
}

export type CategorizeResult = Omit<
  ICategoryRules,
  "ruleId" | "tenantId" | "match" | "confidence" | "createdAt"
> & {
  confidence?: number;
};

export interface IRuleEngine {
  categorize(txn: IRawTxn): CategorizeResult;
}
