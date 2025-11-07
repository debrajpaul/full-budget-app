import { ICategoryRules } from "./category-rules";

export enum ERawTxnType {
  credit = "CREDIT",
  debit = "DEBIT",
  any = "ANY",
}
export interface IRawTxn {
  description: string;
  rules: ICategoryRules[];
  credit: number | null;
  debit: number | null;
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
