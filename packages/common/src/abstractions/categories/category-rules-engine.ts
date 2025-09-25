import { ICategoryRules } from "./category-rules";

export interface IRawTxn {
  description: string;
  rules: ICategoryRules[];
  amount?: number | null; // positive for credits & negative for debits
  // ... your other fields (date, ref, amount, etc.)
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
