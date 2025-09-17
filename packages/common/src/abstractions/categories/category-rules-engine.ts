import { ICategoryRules } from "./category-rules";

export interface IRawTxn {
  description: string;
  rules: ICategoryRules[];
  credit?: number; // positive for credits
  debit?: number; // positive for debits
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
